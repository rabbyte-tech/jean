import { getDatabase } from './index';
import type { Session, SessionStatus } from '@ai-agent/shared';

export function createSession(session: Omit<Session, 'createdAt' | 'updatedAt'> & { createdAt?: string; updatedAt?: string }): Session {
  const db = getDatabase();
  const now = new Date().toISOString();
  const s: Session = {
    ...session,
    createdAt: session.createdAt || now,
    updatedAt: session.updatedAt || now,
  };
  
  db.run(`
    INSERT INTO sessions (id, preconfig_id, title, status, created_at, updated_at, metadata, selected_model, selected_provider)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    s.id,
    s.preconfigId,
    s.title,
    s.status,
    s.createdAt,
    s.updatedAt,
    s.metadata ? JSON.stringify(s.metadata) : null,
    s.selectedModel ?? null,
    s.selectedProvider ?? null
  ]);
  
  return s;
}

export function getSession(id: string): Session | null {
  const db = getDatabase();
  const row = db.query('SELECT * FROM sessions WHERE id = ?').get(id) as any;
  if (!row) return null;
  return mapRowToSession(row);
}

export function listSessions(status?: SessionStatus): Session[] {
  const db = getDatabase();
  let query = 'SELECT * FROM sessions ORDER BY updated_at DESC';
  
  if (status) {
    const rows = db.query('SELECT * FROM sessions WHERE status = ? ORDER BY updated_at DESC').all(status) as any[];
    return rows.map(mapRowToSession);
  }
  
  const rows = db.query(query).all() as any[];
  return rows.map(mapRowToSession);
}

export function updateSession(id: string, updates: Partial<Pick<Session, 'title' | 'status' | 'metadata' | 'preconfigId' | 'selectedModel' | 'selectedProvider'>>): Session | null {
  const db = getDatabase();
  const now = new Date().toISOString();
  
  const setClauses: string[] = ['updated_at = ?'];
  const values: any[] = [now];
  
  if (updates.title !== undefined) {
    setClauses.push('title = ?');
    values.push(updates.title);
  }
  if (updates.status !== undefined) {
    setClauses.push('status = ?');
    values.push(updates.status);
  }
  if (updates.metadata !== undefined) {
    setClauses.push('metadata = ?');
    values.push(updates.metadata ? JSON.stringify(updates.metadata) : null);
  }
  if (updates.preconfigId !== undefined) {
    setClauses.push('preconfig_id = ?');
    values.push(updates.preconfigId);
  }
  if (updates.selectedModel !== undefined) {
    setClauses.push('selected_model = ?');
    values.push(updates.selectedModel);
  }
  if (updates.selectedProvider !== undefined) {
    setClauses.push('selected_provider = ?');
    values.push(updates.selectedProvider);
  }
  
  values.push(id);
  
  db.run(`UPDATE sessions SET ${setClauses.join(', ')} WHERE id = ?`, ...values);
  return getSession(id);
}

export function deleteSession(id: string): boolean {
  const db = getDatabase();
  const result = db.run('DELETE FROM sessions WHERE id = ?', id);
  return result.changes > 0;
}

function mapRowToSession(row: any): Session {
  return {
    id: row.id,
    preconfigId: row.preconfig_id,
    title: row.title,
    status: row.status as SessionStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
    selectedModel: row.selected_model ?? null,
    selectedProvider: row.selected_provider ?? null,
  };
}
