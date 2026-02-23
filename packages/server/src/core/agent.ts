import { generateText, streamText, tool, stepCountIs, jsonSchema, type LanguageModel } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import type { Message, ContentBlock, ToolCallBlock, TextBlock, Preconfig } from '@ai-agent/shared';
import { getTool, executeTool } from '../tools';
import type { DiscoveredTool } from '../tools/types';
import { randomUUID } from 'crypto';

// Provider configuration from environment
// Supported providers: openai, anthropic, openrouter
// For OpenRouter: set LLM_PROVIDER=openrouter and use model names like "openai/gpt-4o"
const LLM_PROVIDER = process.env.LLM_PROVIDER || 'openai';
const LLM_MODEL = process.env.LLM_MODEL || 'gpt-4o';
const LLM_API_KEY = process.env.LLM_API_KEY;
const LLM_BASE_URL = process.env.LLM_BASE_URL;
const LLM_MAX_TOKENS = parseInt(process.env.LLM_MAX_TOKENS || '4096', 10);
const LLM_TEMPERATURE = parseFloat(process.env.LLM_TEMPERATURE || '0.7');

async function getModel(): Promise<LanguageModel> {
  switch (LLM_PROVIDER) {
    case 'openrouter':
      // Use official OpenRouter provider
      const { createOpenRouter } = await import('@openrouter/ai-sdk-provider');
      const openrouter = createOpenRouter({ 
        apiKey: LLM_API_KEY,
      });
      return openrouter.chat(LLM_MODEL) as unknown as LanguageModel;
      
    case 'anthropic':
      const anthropic = createAnthropic({ apiKey: LLM_API_KEY });
      return anthropic(LLM_MODEL) as unknown as LanguageModel;
      
    case 'openai':
    default:
      const openai = createOpenAI({ 
        apiKey: LLM_API_KEY,
        baseURL: LLM_BASE_URL || undefined,
      });
      return openai.chat(LLM_MODEL) as unknown as LanguageModel;
  }
}

export interface ChatOptions {
  sessionId: string;
  preconfig: Preconfig;
  messages: Message[];
  onDelta?: (delta: string) => void;
  onToolCall?: (toolCall: ToolCallBlock) => void;
  onToolApprovalRequired?: (toolCall: ToolCallBlock, dangerous: boolean) => Promise<boolean>;
}

export interface ChatResult {
  message: Message;
  toolCalls: ToolCallBlock[];
}

async function convertToAiSdkMessages(messages: Message[]) {
  const result: { role: 'user' | 'assistant' | 'system' | 'tool'; content: any }[] = [];
  
  // First, build a map of toolCallId -> toolName from all messages
  const toolCallIdToName: Record<string, string> = {};
  for (const msg of messages) {
    for (const block of msg.content) {
      if (block.type === 'tool_call') {
        toolCallIdToName[block.toolCallId] = block.toolName;
      }
    }
  }
  
  // Then process messages as before
  for (const msg of messages) {
    // Separate text and tool_result blocks
    const textBlocks: string[] = [];
    const toolResultBlocks: Array<{
      type: 'tool-result';
      toolCallId: string;
      toolName: string;
      output: unknown;
    }> = [];
    
    for (const block of msg.content) {
      if (block.type === 'text') {
        textBlocks.push(block.text);
      } else if (block.type === 'tool_call') {
        // Track the tool name for this tool call ID
        toolCallIdToName[block.toolCallId] = block.toolName;
      } else if (block.type === 'tool_result') {
        // AI SDK v6 requires output to be wrapped in ToolResultOutput format
        const output = block.isError
          ? { type: 'text' as const, value: JSON.stringify(block.result) }
          : { type: 'json' as const, value: block.result };
        
        toolResultBlocks.push({
          type: 'tool-result' as const,
          toolCallId: block.toolCallId,
          toolName: block.toolName,
          output,
        });
      }
      // Ignore other block types (image) for AI SDK message conversion
    }
    
    // If there are no tool result blocks, keep the original role
    if (toolResultBlocks.length === 0) {
      const content = textBlocks.join('\n\n');
      result.push({
        role: msg.role as 'user' | 'assistant' | 'system',
        content,
      });
      continue;
    }
    
    // If there are only tool result blocks (no text), use role: "tool"
    if (textBlocks.length === 0) {
      // AI SDK expects each tool result as a separate message
      for (const toolResult of toolResultBlocks) {
        result.push({
          role: 'tool' as const,
          content: [toolResult],
        });
      }
      continue;
    }
    
    // Mixed content: text + tool_result
    // First add the text as the original role message
    if (textBlocks.length > 0) {
      const textContent = textBlocks.join('\n\n');
      result.push({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: textContent,
      });
    }
    
    // Then add each tool result as separate tool messages
    for (const toolResult of toolResultBlocks) {
      result.push({
        role: 'tool' as const,
        content: [toolResult],
      });
    }
  }
  
  return result;
}

async function buildAiSdkTools(
  toolNames: string[],
  onToolApprovalRequired?: (toolCall: ToolCallBlock, dangerous: boolean) => Promise<boolean>
): Promise<Record<string, any>> {
  const tools: Record<string, any> = {};
  
  for (const name of toolNames) {
    const discoveredTool = await getTool(name);
    if (!discoveredTool) continue;
    
    const { definition } = discoveredTool;
    const needsApproval = definition.requireApproval;
    
    tools[name] = tool({
      description: definition.description,
      inputSchema: jsonSchema(definition.inputSchema) as any,
      // Don't use AI SDK's needsApproval - we handle approval ourselves in execute
      // needsApproval,
      execute: async (args: Record<string, unknown>) => {
        // If approval is required, AI SDK v6 will handle the approval flow
        // We execute here and return the result
        const toolCall: ToolCallBlock = {
          type: 'tool_call',
          toolCallId: randomUUID(),
          toolName: name,
          args,
        };
        
        if (needsApproval && onToolApprovalRequired) {
          const approved = await onToolApprovalRequired(toolCall, definition.dangerous);
          if (!approved) {
            return { 
              error: 'USER_REJECTION',
              message: `The user explicitly denied permission to execute this tool (${name}). ` +
                       `Do NOT retry this tool call or similar variations. ` +
                       `Acknowledge this rejection to the user and ask what they would like you to do instead, ` +
                       `or suggest alternative approaches that don't require this specific action.`,
              toolName: name,
              args: args
            };
          }
        } else if (needsApproval && !onToolApprovalRequired) {
          return { 
            error: 'USER_REJECTION',
            message: `No approval callback was configured, so the tool (${name}) could not be executed. ` +
                     `This is a configuration error - do NOT retry this tool call. ` +
                     `Inform the user that the tool execution was not possible due to missing approval configuration.`,
            toolName: name,
            args: args
          };
        }
        
        // Execute the tool
        const execResult = await executeTool(discoveredTool, args);
        if (!execResult.success) {
          return { error: execResult.error };
        }
        
        return execResult.result;
      },
    });
  }
  
  return tools;
}

export async function* streamChat(options: ChatOptions): AsyncGenerator<
  | { type: 'delta'; content: string }
  | { type: 'tool_call'; toolCall: ToolCallBlock }
  | { type: 'tool_result'; toolCallId: string; toolName: string; result: unknown }
  | { type: 'approval_required'; toolCall: ToolCallBlock; dangerous: boolean }
  | { type: 'complete'; message: Message }
> {
  const { sessionId, preconfig, messages, onToolApprovalRequired } = options;
  
  const model = await getModel();
  const toolNames = preconfig.tools || [];
  const aiTools = await buildAiSdkTools(toolNames, onToolApprovalRequired);
  
  // Build system message
  const systemMessage = preconfig.systemPrompt;
  
  // Convert messages for ai-sdk
  const aiMessages = await convertToAiSdkMessages(messages);
  
  const result = streamText({
    model,
    system: systemMessage,
    messages: aiMessages,
    tools: aiTools as any,
    maxOutputTokens: LLM_MAX_TOKENS,
    temperature: (preconfig.settings?.temperature ?? LLM_TEMPERATURE) as number,
    stopWhen: stepCountIs(10),
  });

  const contentBlocks: ContentBlock[] = [];
  const toolCalls: ToolCallBlock[] = [];
  let currentText = '';
  const messageId = randomUUID();

  for await (const delta of result.fullStream) {
    
    switch (delta.type) {
      case 'text-delta': {
        const textContent = delta.text || '';
        if (textContent) {
          currentText += textContent;
          yield { type: 'delta', content: textContent };
        }
        break;
      }
        
      case 'tool-call':
        // Flush any pending text before adding the tool call
        if (currentText) {
          contentBlocks.push({ type: 'text', text: currentText });
          currentText = '';
        }
        
        const toolCall: ToolCallBlock = {
          type: 'tool_call',
          toolCallId: delta.toolCallId,
          toolName: delta.toolName,
          args: delta.input as Record<string, unknown>,
        };
        toolCalls.push(toolCall);
        
        // Yield the tool_call event first
        yield { type: 'tool_call', toolCall };
        
        // Also add to contentBlocks for the final message
        contentBlocks.push(toolCall);
        
        // Note: Approval and execution are now handled in the tool's execute function
        // via the needsApproval option. The SDK will call execute after emitting tool-call.
        // We don't need to manually execute here anymore.
        break;
        
      case 'tool-result':
        // AI SDK v6 emits tool-result events after tool execution completes
        // Extract the result from the output
        let result: unknown;
        if (typeof delta.output === 'string') {
          try {
            result = JSON.parse(delta.output);
          } catch {
            result = delta.output;
          }
        } else if (delta.output && typeof delta.output === 'object' && 'value' in delta.output) {
          // AI SDK wraps JSON output in a ToolResultOutput object
          result = (delta.output as { value: unknown }).value;
        } else {
          result = delta.output;
        }
        
        // Yield the tool_result event for streaming to client
        yield {
          type: 'tool_result',
          toolCallId: delta.toolCallId,
          toolName: delta.toolName,
          result,
        };
        
        // Also add to contentBlocks for the final message
        const isErrorResult = !!(result && typeof result === 'object' && 'error' in result);
        contentBlocks.push({
          type: 'tool_result',
          toolCallId: delta.toolCallId,
          toolName: delta.toolName,
          result,
          isError: isErrorResult,
        });
        break;
    }
  }

  // Finalize text block - push (append) any remaining text, don't prepend
  if (currentText) {
    contentBlocks.push({ type: 'text', text: currentText });
  }

  const finalMessage: Message = {
    id: messageId,
    role: 'assistant',
    content: contentBlocks.length > 0 ? contentBlocks : [{ type: 'text', text: '' }],
    createdAt: new Date().toISOString(),
  };

  yield { type: 'complete', message: finalMessage };
}

export async function chat(options: ChatOptions): Promise<ChatResult> {
  let finalMessage: Message | null = null;
  const toolCalls: ToolCallBlock[] = [];
  
  for await (const event of streamChat(options)) {
    if (event.type === 'tool_call') {
      toolCalls.push(event.toolCall);
    }
    if (event.type === 'complete') {
      finalMessage = event.message;
    }
  }
  
  return {
    message: finalMessage!,
    toolCalls,
  };
}
