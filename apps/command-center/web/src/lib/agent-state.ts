import type { AgentState } from '@command-center/shared';

type PillVariant = 'default' | 'success' | 'warning' | 'destructive' | 'muted' | 'secondary';

// Map an agent state to a badge variant + a short label for the health pills.
export function agentStateMeta(state: AgentState): { variant: PillVariant; label: string } {
  switch (state) {
    case 'running':
      return { variant: 'success', label: 'running' };
    case 'starting':
      return { variant: 'default', label: 'starting' };
    case 'awaiting_approval':
      return { variant: 'warning', label: 'approval' };
    case 'awaiting_input':
      return { variant: 'warning', label: 'input' };
    case 'compacting':
      return { variant: 'secondary', label: 'compacting' };
    case 'stopping':
      return { variant: 'secondary', label: 'stopping' };
    case 'done':
      return { variant: 'muted', label: 'done' };
    case 'error':
      return { variant: 'destructive', label: 'error' };
    case 'idle':
    default:
      return { variant: 'muted', label: 'idle' };
  }
}
