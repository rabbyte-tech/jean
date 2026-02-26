import { useState, useRef, useEffect } from 'react';
import type { Workspace } from '@jean2/shared';
import './WorkspaceSelector.css';

interface WorkspaceSelectorProps {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  onSelectWorkspace: (workspace: Workspace) => void;
  onCreateVirtualWorkspace: () => void;
  onCreatePhysicalWorkspace: (path: string) => void;
  onDeleteWorkspace: (id: string) => void;
}

export default function WorkspaceSelector({
  workspaces,
  activeWorkspace,
  onSelectWorkspace,
  onCreateVirtualWorkspace,
  onCreatePhysicalWorkspace,
  onDeleteWorkspace,
}: WorkspaceSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleDirectoryPicker = async () => {
    setIsOpen(false);
    // We can't get full path from File System Access API for security reasons
    // Always use prompt to get the actual path
    const path = prompt('Enter directory path (e.g., /Users/name/projects/myapp):');
    if (path) onCreatePhysicalWorkspace(path);
  };

  const handleSelectWorkspace = (workspace: Workspace) => {
    onSelectWorkspace(workspace);
    setIsOpen(false);
  };

  const handleDeleteWorkspace = (e: React.MouseEvent, workspaceId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this workspace?')) {
      onDeleteWorkspace(workspaceId);
    }
    setIsOpen(false);
  };

  const truncatePath = (path: string, maxLength: number = 30): string => {
    if (path.length <= maxLength) return path;
    return '...' + path.slice(-maxLength + 3);
  };

  return (
    <div className="workspace-selector" ref={dropdownRef}>
      <button
        className="workspace-selector-trigger"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <span className="workspace-name">
          {activeWorkspace?.name || 'Select Workspace'}
        </span>
        <span className="dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="workspace-dropdown">
          {workspaces.length > 0 ? (
            workspaces.map((workspace) => (
              <div
                key={workspace.id}
                className={`workspace-option ${
                  workspace.id === activeWorkspace?.id ? 'active' : ''
                }`}
                onClick={() => handleSelectWorkspace(workspace)}
              >
                <span className="workspace-option-check">
                  {workspace.id === activeWorkspace?.id && '✓'}
                </span>
                <span className="workspace-option-name">{workspace.name}</span>
                <span className="workspace-option-type">
                  {workspace.isVirtual ? (
                    <span className="virtual-badge">virtual</span>
                  ) : (
                    <span className="physical-path" title={workspace.path}>
                      {truncatePath(workspace.path)}
                    </span>
                  )}
                </span>
                {workspace.id === activeWorkspace?.id && (
                  <button
                    className="workspace-delete-btn"
                    onClick={(e) => handleDeleteWorkspace(e, workspace.id)}
                    title="Delete workspace"
                    type="button"
                  >
                    ×
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="workspace-option disabled">No workspaces</div>
          )}

          <div className="dropdown-divider" />

          <div
            className="workspace-option create-option"
            onClick={() => {
              setIsOpen(false);
              onCreateVirtualWorkspace();
            }}
          >
            + Create Virtual Workspace
          </div>

          <div
            className="workspace-option create-option"
            onClick={handleDirectoryPicker}
          >
            + Create from Directory...
          </div>
        </div>
      )}
    </div>
  );
}
