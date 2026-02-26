export interface SessionCreateMessage {
  type: 'session.create';
  workspaceId?: string;
  preconfigId?: string;
  title?: string;
}

export interface SessionResumeMessage {
  type: 'session.resume';
  sessionId: string;
}

export interface ChatMessage {
  type: 'chat.message';
  sessionId: string;
  content: string;
}

export interface ToolApprovalMessage {
  type: 'tool.approval';
  toolCallId: string;
  approved: boolean;
}

export interface SessionCloseMessage {
  type: 'session.close';
  sessionId: string;
}

export interface SessionUpdateMessage {
  type: 'session.update';
  sessionId: string;
  preconfigId?: string;
}

export interface SessionUpdateModelMessage {
  type: 'session.update_model';
  sessionId: string;
  modelId: string;
  providerId: string;
}

export interface SessionReopenMessage {
  type: 'session.reopen';
  sessionId: string;
}

export interface SessionDeleteMessage {
  type: 'session.delete';
  sessionId: string;
}

export type ClientMessage = 
  | SessionCreateMessage 
  | SessionResumeMessage 
  | ChatMessage 
  | ToolApprovalMessage 
  | SessionCloseMessage
  | SessionUpdateMessage
  | SessionUpdateModelMessage
  | SessionReopenMessage
  | SessionDeleteMessage;
