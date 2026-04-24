function HITLCard({ event, resolution, onApprove, onDeny }) {
  const resolved = resolution !== null && resolution !== undefined;
  const accent = resolved
    ? (resolution === 'approve' ? 'var(--theme-accent-success)' : 'var(--theme-accent-error)')
    : 'var(--theme-accent-warning)';
  const tint = resolved
    ? (resolution === 'approve' ? 'rgba(15,92,62,.06)' : 'rgba(139,42,29,.06)')
    : 'rgba(180,83,9,.05)';
  const cmd = event.payload?.tool_input?.command || '';

  return (
    <div style={{
      position: 'relative',
      background: 'var(--theme-bg-primary)',
      border: '1px solid var(--theme-border-primary)',
      borderLeft: `4px solid ${accent}`,
      boxShadow: `0 0 0 1px ${accent}33`,
      borderRadius: 8,
      padding: 12,
      marginBottom: 10,
      backgroundImage: `linear-gradient(to right, ${tint}, transparent 60%)`
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{
          width: 24, height: 24, borderRadius: 6,
          background: `color-mix(in srgb, ${accent} 15%, transparent)`,
          color: accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <IconLock size={14} stroke={2} />
        </div>
        <span style={{ fontSize: 14, fontWeight: 600, color: accent }}>Permission Request</span>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 11,
          background: 'var(--theme-bg-tertiary)',
          color: 'var(--theme-text-secondary)',
          padding: '2px 8px', borderRadius: 4
        }}>{event.payload?.tool_name}</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: accent, display: 'flex', alignItems: 'center', gap: 4 }}>
          {!resolved && <IconSpinner size={12} />}
          {resolved ? (resolution === 'approve' ? '✓ Approved' : '✗ Denied') : 'Awaiting'}
        </span>
      </div>

      <p style={{
        margin: '0 0 12px 32px',
        background: 'var(--theme-bg-secondary)',
        border: '1px solid var(--theme-border-primary)',
        padding: 10, borderRadius: 6,
        fontSize: 14, color: 'var(--theme-text-primary)'
      }}>
        Run <code style={{
          fontFamily: 'var(--font-mono)',
          background: 'var(--theme-bg-tertiary)',
          color: accent,
          padding: '1px 5px', borderRadius: 3
        }}>{cmd}</code> in the repo root?
      </p>

      {!resolved && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginLeft: 32 }}>
          <button className="hitl-btn hitl-deny" onClick={onDeny}>Deny</button>
          <button className="hitl-btn hitl-approve" onClick={onApprove}>Approve</button>
        </div>
      )}
    </div>
  );
}

window.HITLCard = HITLCard;
