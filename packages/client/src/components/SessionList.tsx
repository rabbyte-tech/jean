import type { Session, Preconfig, Workspace } from '@jean/shared';
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
  workspaces,
  activeWorkspace,
  onSelectWorkspace,
  onCreateVirtualWorkspace,
  onCreatePhysicalWorkspace,
  onDeleteWorkspace,
}: Props) {
  const defaultPreconfig = preconfigs.find(p => p.isDefault) || preconfigs[0];
  
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
      
      <div className="sessions">
        {sessions.map(session => (
          <div
            key={session.id}
            className={`session-item ${currentSession?.id === session.id ? 'active' : ''}`}
            onClick={() => onResumeSession(session.id)}
          >
            <span className="session-title">{session.title || 'Untitled'}</span>
            <span className="session-status">{session.status}</span>
            <button
              className="close-btn"
              onClick={(e) => {
                e.stopPropagation();
                onCloseSession(session.id);
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
