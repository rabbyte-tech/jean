import type { ToolCallBlock } from '@ai-agent/shared';
import './ApprovalDialog.css';

interface Props {
  toolCall: ToolCallBlock;
  dangerous: boolean;
  onApprove: () => void;
  onDeny: () => void;
}

export default function ApprovalDialog({ toolCall, dangerous, onApprove, onDeny }: Props) {
  return (
    <div className="approval-overlay">
      <div className="approval-dialog">
        <h3>Tool Approval Required</h3>
        {dangerous && (
          <div className="warning">⚠️ This tool is marked as dangerous</div>
        )}
        <div className="tool-info">
          <p><strong>Tool:</strong> {toolCall.toolName}</p>
          <pre>{JSON.stringify(toolCall.args, null, 2)}</pre>
        </div>
        <div className="actions">
          <button className="deny" onClick={onDeny}>Deny</button>
          <button className="approve" onClick={onApprove}>Approve</button>
        </div>
      </div>
    </div>
  );
}
