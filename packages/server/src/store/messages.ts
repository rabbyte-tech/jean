import { getDatabase } from './index';
import type { Message, ContentBlock } from '@ai-agent/shared';

// Interface for raw database row from messages table
interface MessageRow {
  id: string;
  session_id: string;
  role: string;
  content: string;
  created_at: string;
}

export function createMessage(message: Omit<Message, 'createdAt'> & { createdAt?: string; sessionId: string }): Message {
  const db = getDatabase();
  const now = new Date().toISOString();
  const m: Message & { sessionId: string } = {
    ...message,
    createdAt: message.createdAt || now,
  };
  
  db.run(`
    INSERT INTO messages (id, session_id, role, content, created_at)
    VALUES (?, ?, ?, ?, ?)
  `, [
    m.id,
    m.sessionId,
    m.role,
    JSON.stringify(m.content),
    m.createdAt
  ]);
  
  return m;
}

export function getMessage(id: string): Message | null {
  const db = getDatabase();
  const row = db.query('SELECT * FROM messages WHERE id = ?').get(id) as MessageRow | undefined;
  if (!row) return null;
  return mapRowToMessage(row);
}

export function listMessages(sessionId: string): Message[] {
  const db = getDatabase();
  const rows = db.query('SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC').all(sessionId) as MessageRow[];
  return rows.map(mapRowToMessage);
}

export function deleteMessages(sessionId: string): number {
  const db = getDatabase();
  const result = db.run('DELETE FROM messages WHERE session_id = ?', [sessionId]);
  return result.changes;
}

function mapRowToMessage(row: MessageRow): Message {
  return {
    id: row.id,
    role: row.role as Message['role'],
    content: JSON.parse(row.content) as ContentBlock[],
    createdAt: row.created_at,
  };
}
