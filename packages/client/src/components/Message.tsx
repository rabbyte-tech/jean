import { useState } from 'react';
import type { Message as MessageType, ContentBlock, ToolCallBlock, ToolResultBlock } from '@ai-agent/shared';
import { MarkdownRenderer } from './MarkdownRenderer';
import './Message.css';

interface Props {
  message: MessageType;
}

export default function Message({ message }: Props) {
  const roleClass = message.role === 'user' ? 'user' : 'assistant';
  
  // Group tool_call and tool_result blocks together by toolCallId
  const groupedContent = groupToolCallsAndResults(message.content);
  
  return (
    <div className={`message ${roleClass}`}>
      <div className="message-role">{message.role}</div>
      <div className="message-content">
        {groupedContent.map((item, i) => (
          <ContentBlockComponent key={i} item={item} />
        ))}
      </div>
    </div>
  );
}

/**
 * Groups tool_call blocks with their corresponding tool_result blocks by toolCallId.
 * Returns an array that can be either a single ContentBlock or a grouped pair.
 */
type ContentItem = ContentBlock | { type: 'grouped_tool'; toolCall: ToolCallBlock; toolResult: ToolResultBlock | null };

function groupToolCallsAndResults(content: ContentBlock[]): ContentItem[] {
  const result: ContentItem[] = [];
  
  // First pass: build a map of tool_results indexed by toolCallId
  const toolResultMap = new Map<string, ToolResultBlock>();
  for (const block of content) {
    if (block.type === 'tool_result') {
      toolResultMap.set(block.toolCallId, block);
    }
  }
  
  // Track which results have been "used" (already output with their call)
  const usedResultIds = new Set<string>();
  
  // Second pass: process content in order
  for (const block of content) {
    if (block.type === 'tool_call') {
      // Output a grouped_tool with the call and its result (if available)
      const toolResult = toolResultMap.get(block.toolCallId) ?? null;
      if (toolResult) {
        usedResultIds.add(block.toolCallId);
      }
      result.push({ type: 'grouped_tool', toolCall: block, toolResult });
    } else if (block.type === 'tool_result') {
      // Skip if this result was already output with its tool_call
      if (usedResultIds.has(block.toolCallId)) {
        continue;
      }
      // Orphan tool_result (no corresponding tool_call), output as-is
      result.push(block);
    } else {
      // Pass through other block types as-is
      result.push(block);
    }
  }
  
  return result;
}

// Collapsible tool block component for grouped_tool items
function ToolBlock({ toolCall, toolResult }: { toolCall: ToolCallBlock; toolResult: ToolResultBlock | null }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Format args preview (truncate to ~50 chars)
  const argsPreview = JSON.stringify(toolCall.args);
  const truncatedArgs = argsPreview.length > 50 ? argsPreview.slice(0, 47) + '...' : argsPreview;
  
  return (
    <div className={`tool-group-block ${toolCall.pending ? 'pending' : ''}`}>
      <div 
        className="tool-header clickable" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="tool-chevron">{isExpanded ? '▼' : '▶'}</span>
        <span className="tool-name">🔧 {toolCall.toolName}</span>
        {!isExpanded && <span className="tool-args-preview">{truncatedArgs}</span>}
        {toolCall.pending && <span className="tool-status">⏳ Executing...</span>}
      </div>
      
      {isExpanded && (
        <>
          <div className="tool-args-section">
            <div className="tool-args-label">Arguments:</div>
            <pre className="tool-args">{JSON.stringify(toolCall.args, null, 2)}</pre>
          </div>
          {toolResult && (
            <div className={`tool-result-section ${toolResult.isError ? 'error' : ''}`}>
              <div className="tool-result-label">Result:</div>
              <pre className="tool-result-content">
                {typeof toolResult.result === 'string' 
                  ? toolResult.result 
                  : JSON.stringify(toolResult.result, null, 2)}
              </pre>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Collapsible tool call block (for non-grouped tool_call blocks)
function CollapsibleToolCallBlock({ block }: { block: ToolCallBlock }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const argsPreview = JSON.stringify(block.args);
  const truncatedArgs = argsPreview.length > 50 ? argsPreview.slice(0, 47) + '...' : argsPreview;
  
  return (
    <div className={`tool-call-block ${block.pending ? 'pending' : ''}`}>
      <div 
        className="tool-header clickable" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="tool-chevron">{isExpanded ? '▼' : '▶'}</span>
        <span className="tool-name">🔧 {block.toolName}</span>
        {!isExpanded && <span className="tool-args-preview">{truncatedArgs}</span>}
        {block.pending && <span className="tool-status">⏳ Executing...</span>}
      </div>
      
      {isExpanded && (
        <pre className="tool-args">{JSON.stringify(block.args, null, 2)}</pre>
      )}
    </div>
  );
}

// Collapsible tool result block (for non-grouped tool_result blocks)
function CollapsibleToolResultBlock({ block }: { block: ToolResultBlock }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className={`tool-result-block ${block.isError ? 'error' : ''}`}>
      <div 
        className="tool-header clickable" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="tool-chevron">{isExpanded ? '▼' : '▶'}</span>
        <span className="tool-name">📤 Result</span>
      </div>
      
      {isExpanded && (
        <pre className="result-content">
          {typeof block.result === 'string' 
            ? block.result 
            : JSON.stringify(block.result, null, 2)}
        </pre>
      )}
    </div>
  );
}

function ContentBlockComponent({ item }: { item: ContentItem }) {
  
  // Handle grouped tool call + result
  if (item.type === 'grouped_tool') {
    const { toolCall, toolResult } = item;
    return <ToolBlock toolCall={toolCall} toolResult={toolResult} />;
  }
  
  // Handle regular content blocks
  const block = item as ContentBlock;
  
  switch (block.type) {
    case 'text':
      return (
        <div className="text-block">
          <MarkdownRenderer>{block.text || '...'}</MarkdownRenderer>
        </div>
      );
    
    case 'tool_call':
      // This case shouldn't normally be reached due to grouping, 
      // but include for completeness - make it collapsible too
      return <CollapsibleToolCallBlock block={block} />;
    
    case 'tool_result':
      // This case shouldn't normally be reached due to grouping,
      // but include for completeness - make it collapsible too
      return <CollapsibleToolResultBlock block={block} />;
    
    case 'image':
      return (
        <div className="image-block">
          <img src={block.url} alt="" />
        </div>
      );
    
    default:
      return null;
  }
}
