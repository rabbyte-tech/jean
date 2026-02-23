import type { ToolCallBlock } from '@ai-agent/shared';

interface PendingApproval {
  toolCall: ToolCallBlock;
  dangerous: boolean;
  resolve: (approved: boolean) => void;
  createdAt: number;
}

// Store pending approvals by toolCallId
const pendingApprovals = new Map<string, PendingApproval>();

// Timeout for pending approvals (5 minutes)
const APPROVAL_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Create a pending approval request.
 * Returns a Promise that resolves when the client approves/denies or times out.
 */
export function createPendingApproval(
  toolCall: ToolCallBlock,
  dangerous: boolean
): Promise<boolean> {
  return new Promise((resolve) => {
    // Store the approval with its resolver
    pendingApprovals.set(toolCall.toolCallId, {
      toolCall,
      dangerous,
      resolve,
      createdAt: Date.now(),
    });
    
    // Set up timeout
    setTimeout(() => {
      const pending = pendingApprovals.get(toolCall.toolCallId);
      if (pending) {
        pendingApprovals.delete(toolCall.toolCallId);
        resolve(false); // Deny on timeout
      }
    }, APPROVAL_TIMEOUT_MS);
  });
}

/**
 * Get a pending approval by ID.
 */
export function getPendingApproval(toolCallId: string): PendingApproval | undefined {
  return pendingApprovals.get(toolCallId);
}

/**
 * Resolve a pending approval with the client's response.
 * Returns true if the approval was found and resolved.
 */
export function resolveApproval(toolCallId: string, approved: boolean): boolean {
  const pending = pendingApprovals.get(toolCallId);
  if (!pending) {
    return false;
  }
  
  pendingApprovals.delete(toolCallId);
  pending.resolve(approved);
  return true;
}

/**
 * Clean up expired pending approvals.
 */
export function cleanupExpiredApprovals(): void {
  const now = Date.now();
  for (const [id, pending] of pendingApprovals.entries()) {
    if (now - pending.createdAt > APPROVAL_TIMEOUT_MS) {
      pendingApprovals.delete(id);
      pending.resolve(false);
    }
  }
}
