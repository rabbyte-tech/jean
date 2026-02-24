import { getDatabase } from './index';
import type { ToolApproval, ToolApprovalStatus } from '@ai-agent/shared';

export function createToolApproval(approval: Omit<ToolApproval, 'respondedAt'> & { respondedAt?: string | null }): ToolApproval {
  const db = getDatabase();
  const a: ToolApproval = {
    ...approval,
    respondedAt: approval.respondedAt || null,
  };
  
  db.run(`
    INSERT INTO tool_approvals (id, session_id, tool_call_id, tool_name, args, status, requested_at, responded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    a.id,
    a.sessionId,
    a.toolCallId,
    a.toolName,
    JSON.stringify(a.args),
    a.status,
    a.requestedAt,
    a.respondedAt
  ]);
  
  return a;
}

export function updateToolApproval(id: string, updates: { status: ToolApprovalStatus; respondedAt: string }): void {
  const db = getDatabase();
  db.run(`
    UPDATE tool_approvals SET status = ?, responded_at = ? WHERE id = ?
  `, [updates.status, updates.respondedAt, id]);
}

export function getToolApproval(id: string): ToolApproval | null {
  const db = getDatabase();
  const row = db.query('SELECT * FROM tool_approvals WHERE id = ?').get(id) as any;
  if (!row) return null;
  return mapRowToToolApproval(row);
}

export function getToolApprovalByCallId(toolCallId: string): ToolApproval | null {
  const db = getDatabase();
  const row = db.query('SELECT * FROM tool_approvals WHERE tool_call_id = ?').get(toolCallId) as any;
  if (!row) return null;
  return mapRowToToolApproval(row);
}

export function listPendingApprovals(sessionId: string): ToolApproval[] {
  const db = getDatabase();
  const rows = db.query('SELECT * FROM tool_approvals WHERE session_id = ? AND status = ? ORDER BY requested_at ASC').all(sessionId, 'pending') as any[];
  return rows.map(mapRowToToolApproval);
}

function mapRowToToolApproval(row: any): ToolApproval {
  return {
    id: row.id,
    sessionId: row.session_id,
    toolCallId: row.tool_call_id,
    toolName: row.tool_name,
    args: JSON.parse(row.args),
    status: row.status as ToolApprovalStatus,
    requestedAt: row.requested_at,
    respondedAt: row.responded_at,
  };
}
