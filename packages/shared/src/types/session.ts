export type SessionStatus = 'active' | 'paused' | 'closed';

export interface Session {
  id: string;
  preconfigId: string | null;
  title: string | null;
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown> | null;
}
