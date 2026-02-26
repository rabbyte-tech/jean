import type { Session } from '../types/session';
import type { Message, ToolCallBlock } from '../types/message';

export interface SessionCreatedMessage {
  type: 'session.created';
  session: Session;
}

export interface SessionResumedMessage {
  type: 'session.resumed';
  session: Session;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ChatStartMessage {
  type: 'chat.start';
  sessionId: string;
  messageId: string;
}

export interface ChatDeltaMessage {
  type: 'chat.delta';
  sessionId: string;
  messageId: string;
  delta: string;
}

export interface ChatToolCallMessage {
  type: 'chat.tool_call';
  sessionId: string;
  messageId: string;
  toolCall: ToolCallBlock;
}

export interface ChatToolResultMessage {
  type: 'chat.tool_result';
  sessionId: string;
  messageId: string;
  toolCallId: string;
  toolName: string;
  result: unknown;
  isError?: boolean;
}

export interface ToolApprovalRequiredMessage {
  type: 'tool.approval_required';
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  dangerous: boolean;
}

export interface ChatCompleteMessage {
  type: 'chat.complete';
  sessionId: string;
  message: Message;
}

export interface ErrorMessage {
  type: 'error';
  code: string;
  message: string;
}

export interface SessionClosedMessage {
  type: 'session.closed';
  sessionId: string;
}

export interface SessionUpdatedMessage {
  type: 'session.updated';
  session: Session;
}

export interface SessionReopenedMessage {
  type: 'session.reopened';
  session: Session;
}

export interface SessionDeletedMessage {
  type: 'session.deleted';
  sessionId: string;
}

export interface ChatUsageMessage {
  type: 'chat.usage';
  sessionId: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
}

export interface ChatUserMessageMessage {
  type: 'chat.user_message';
  sessionId: string;
  message: Message;
}

export type ServerMessage =
  | SessionCreatedMessage
  | SessionResumedMessage
  | ChatStartMessage
  | ChatDeltaMessage
  | ChatToolCallMessage
  | ChatToolResultMessage
  | ToolApprovalRequiredMessage
  | ChatCompleteMessage
  | ErrorMessage
  | SessionClosedMessage
  | SessionUpdatedMessage
  | SessionReopenedMessage
  | SessionDeletedMessage
  | ChatUsageMessage
  | ChatUserMessageMessage;
