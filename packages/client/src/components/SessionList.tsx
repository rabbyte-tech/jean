import type { Session, Preconfig, Workspace } from '@jean2/shared';
import WorkspaceSelector from './WorkspaceSelector';
import './SessionList.css';

interface Props {
  sessions: Session[];
  preconfigs: Preconfig[];
  currentSession: Session | null;
  connected: boolean;
  onCreateSession: (preconfigId?: string, title?: string) => void;
  onResumeSession: (sessionId: string) => void;
  onCloseSession: (sessionId: string) => void;
  onReopenSession: (sessionId: string) => void;
  onPermanentlyDeleteSession: (sessionId: string) => void;
  sessionFilter: 'active' | 'all';
  onSetSessionFilter: (filter: 'active' | 'all') => void;
  
  // Workspace props
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  onSelectWorkspace: (workspace: Workspace) => void;
  onCreateVirtualWorkspace: () => void;
  onCreatePhysicalWorkspace: (path: string) => void;
  onDeleteWorkspace: (id: string) => void;
}

export default function SessionList({
  sessions,
  preconfigs,
  currentSession,
  connected,
  onCreateSession,
  onResumeSession,
  onCloseSession,
  onReopenSession,
  onPermanentlyDeleteSession,
  sessionFilter,
  onSetSessionFilter,
  workspaces,
  activeWorkspace,
  onSelectWorkspace,
  onCreateVirtualWorkspace,
  onCreatePhysicalWorkspace,
  onDeleteWorkspace,
}: Props) {
  const defaultPreconfig = preconfigs.find(p => p.isDefault) || preconfigs[0];
  
  // Filter sessions based on the current filter
  const filteredSessions = sessionFilter === 'active' 
    ? sessions.filter(s => s.status === 'active')
    : sessions.filter(s => s.status === 'closed');
  
  return (
    <div className="session-list">
      {/* Workspace selector at the top */}
      <WorkspaceSelector
        workspaces={workspaces}
        activeWorkspace={activeWorkspace}
        onSelectWorkspace={onSelectWorkspace}
        onCreateVirtualWorkspace={onCreateVirtualWorkspace}
        onCreatePhysicalWorkspace={onCreatePhysicalWorkspace}
        onDeleteWorkspace={onDeleteWorkspace}
      />
      
      <div className="session-list-header">
        <h3>Sessions</h3>
        <span className={`status ${connected ? 'connected' : 'disconnected'}`}>
          {connected ? '●' : '○'}
        </span>
      </div>
      
      <button
        className="new-session-btn"
        onClick={() => onCreateSession(defaultPreconfig?.id)}
        disabled={!connected}
      >
        + New Session
      </button>
      
      <div className="session-tabs">
        <button 
          className={`session-tab ${sessionFilter === 'active' ? 'active' : ''}`}
          onClick={() => onSetSessionFilter('active')}
        >
          Active
        </button>
        <button 
          className={`session-tab ${sessionFilter === 'all' ? 'active' : ''}`}
          onClick={() => onSetSessionFilter('all')}
        >
          Archived
        </button>
      </div>
      
      <div className="sessions">
        {filteredSessions.map(session => (
          <div
            key={session.id}
            className={`session-item ${currentSession?.id === session.id ? 'active' : ''} ${session.status === 'closed' ? 'archived' : ''}`}
            onClick={() => onResumeSession(session.id)}
          >
            <span className="session-title">{session.title || 'Untitled'}</span>
            <span className="session-status">{session.status}</span>
            {session.status === 'closed' ? (
              <>
                <button
                  className="reopen-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onReopenSession(session.id);
                  }}
                  title="Reopen session"
                >
                  ↻
                </button>
                <button
                  className="delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    const sessionTitle = session.title || 'Untitled';
                    if (confirm(`Are you sure you want to permanently delete "${sessionTitle}"?\n\nThis action cannot be undone.`)) {
                      onPermanentlyDeleteSession(session.id);
                    }
                  }}
                  title="Delete permanently"
                >
                  🗑
                </button>
              </>
            ) : (
              <button
                className="close-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseSession(session.id);
                }}
                title="Archive session"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
