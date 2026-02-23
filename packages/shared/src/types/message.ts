// Content blocks (ACP-lite)
export interface TextBlock {
  type: 'text';
  text: string;
}

export interface ToolCallBlock {
  type: 'tool_call';
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  pending?: boolean;
}

export interface ToolResultBlock {
  type: 'tool_result';
  toolCallId: string;
  toolName: string;
  result: unknown;
  isError?: boolean;
}

export interface ImageBlock {
  type: 'image';
  url: string;
  mimeType?: string;
}

export type ContentBlock = TextBlock | ToolCallBlock | ToolResultBlock | ImageBlock;

// Message
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: ContentBlock[];
  createdAt: string;
}
