// ─────────────────────────────────────────────────────────────────────────────
// wireApprovalEngine — connect the ApprovalBus to every edge:
//   • SessionRegistry.setAgentHooks → every new AgentSession gets the canUseTool
//     permission gate + the ask_human MCP server.
//   • routes/approvals (setApprovalResponder) → POST /api/approvals/:id/respond
//     resolves the parked promise (throws 404 if unknown → REST 404).
//   • ws gateway (onApprovalRespond) → the low-latency `approval:respond` path
//     (errors swallowed; the REST path is the authoritative one).
//
// Called once from server.ts after wireAgentEngine().
// ─────────────────────────────────────────────────────────────────────────────

import { approvalBus } from '../bus/approval-bus';
import { setApprovalResponder } from '../routes/approvals';
import { setGatewayHandlers } from '../ws/gateway';
import { sessionRegistry } from './registry';
import { makeCanUseTool } from './canUseTool';
import { makeMcpServers } from './ask-human';

export function wireApprovalEngine(): void {
  sessionRegistry.setAgentHooks({ makeCanUseTool, makeMcpServers });

  setApprovalResponder({
    respond: (decision) => approvalBus.respond(decision),
  });

  setGatewayHandlers({
    onApprovalRespond: (decision) => {
      try {
        approvalBus.respond(decision);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[ws] approval:respond failed:', err);
      }
    },
  });
}
