import { Database } from 'bun:sqlite';
import { join, dirname } from 'path';
import { mkdirSync } from 'fs';

let db: Database | null = null;

export function getDatabase(): Database {
  if (!db) {
    const dbPath = process.env.DATABASE_PATH || join(process.cwd(), 'data', 'agent.db');
    
    // Ensure the directory exists
    const dbDir = dirname(dbPath);
    mkdirSync(dbDir, { recursive: true });
    
    db = new Database(dbPath);
    // Enable WAL mode for better concurrency
    db.run('PRAGMA journal_mode = WAL');
    initializeSchema(db);
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

function initializeSchema(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      preconfig_id TEXT,
      title TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      metadata TEXT,
      selected_model TEXT,
      selected_provider TEXT,
      prompt_tokens INTEGER DEFAULT 0,
      completion_tokens INTEGER DEFAULT 0,
      total_tokens INTEGER DEFAULT 0
    )
  `);
  
  // Add selected_model column if it doesn't exist (for existing databases)
  try {
    db.run('ALTER TABLE sessions ADD COLUMN selected_model TEXT');
  } catch (e: any) {
    // Ignore error if column already exists
    if (!e.message?.includes('duplicate column name')) {
      console.warn('Could not add selected_model column:', e.message);
    }
  }
  
  // Add selected_provider column if it doesn't exist (for existing databases)
  try {
    db.run('ALTER TABLE sessions ADD COLUMN selected_provider TEXT');
  } catch (e: any) {
    // Ignore error if column already exists
    if (!e.message?.includes('duplicate column name')) {
      console.warn('Could not add selected_provider column:', e.message);
    }
  }
  
  // Add prompt_tokens column if it doesn't exist (for existing databases)
  try {
    db.run('ALTER TABLE sessions ADD COLUMN prompt_tokens INTEGER DEFAULT 0');
  } catch (e: any) {
    // Ignore error if column already exists
    if (!e.message?.includes('duplicate column name')) {
      console.warn('Could not add prompt_tokens column:', e.message);
    }
  }
  
  // Add completion_tokens column if it doesn't exist (for existing databases)
  try {
    db.run('ALTER TABLE sessions ADD COLUMN completion_tokens INTEGER DEFAULT 0');
  } catch (e: any) {
    // Ignore error if column already exists
    if (!e.message?.includes('duplicate column name')) {
      console.warn('Could not add completion_tokens column:', e.message);
    }
  }
  
  // Add total_tokens column if it doesn't exist (for existing databases)
  try {
    db.run('ALTER TABLE sessions ADD COLUMN total_tokens INTEGER DEFAULT 0');
  } catch (e: any) {
    // Ignore error if column already exists
    if (!e.message?.includes('duplicate column name')) {
      console.warn('Could not add total_tokens column:', e.message);
    }
  }
  
  db.run('CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status)');

  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    )
  `);
  
  db.run('CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, created_at)');

  db.run(`
    CREATE TABLE IF NOT EXISTS tool_executions (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      tool_call_id TEXT NOT NULL,
      tool_name TEXT NOT NULL,
      args TEXT NOT NULL,
      result TEXT,
      error TEXT,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tool_approvals (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      tool_call_id TEXT NOT NULL,
      tool_name TEXT NOT NULL,
      args TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      requested_at TEXT NOT NULL,
      responded_at TEXT,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    )
  `);
}

export { Database };

// Re-export all store modules
export * from './sessions';
export * from './messages';
export * from './tool-executions';
export * from './tool-approvals';
