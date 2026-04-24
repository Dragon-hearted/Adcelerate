function EventRow({ event, expanded, onToggle }) {
  const color = hashApp(event.source_app);
  const style = EVENT_STYLES[event.hook_event_type] || { bg: 'var(--theme-bg-tertiary)', fg: 'var(--theme-text-secondary)' };
  const toolName = event.payload?.tool_name;
  const detail = toolDetail(event);
  const prompt = event.hook_event_type === 'UserPromptSubmit';

  return (
    <div
      className="event-row"
      onClick={onToggle}
      style={{ position: 'relative' }}
    >
      {/* App color bar */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
        borderRadius: '8px 0 0 8px', background: color, opacity: .9
      }} />
      <div style={{ marginLeft: 12 }}>
        {/* Meta row — app chip + session id + agent chip on left, timestamp right */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6, alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center',
              fontSize: 11, fontWeight: 600, padding: '2px 7px',
              borderRadius: 4, border: `1px solid ${color}`,
              background: `${color}14`, color: color,
              whiteSpace: 'nowrap', flexShrink: 0
            }}>{event.source_app}</span>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--theme-text-quaternary)', flexShrink: 0 }}>
              {shortSession(event.session_id)}
            </span>
            {event.payload?.agent_id && (
              <span className="chip-agent" style={{ flexShrink: 0 }}>
                <IconAgent size={12} stroke={2} />
                {event.payload.agent_id.split('@')[0]}
              </span>
            )}
          </div>
          <span style={{
            fontSize: 11, fontFamily: 'var(--font-mono)',
            color: 'var(--theme-text-quaternary)',
            fontVariantNumeric: 'tabular-nums', flexShrink: 0
          }}>{formatTime(event.timestamp)}</span>
        </div>

        {/* Event + tool row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11, fontWeight: 600,
            padding: '2px 8px', borderRadius: 4,
            background: style.bg, color: style.fg,
            border: `1px solid ${style.fg}`
          }}>
            {event.hook_event_type}
          </span>
          {toolName && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontFamily: 'var(--font-mono)',
              fontSize: 11, fontWeight: 600,
              color: 'var(--theme-primary)',
              background: 'var(--theme-bg-secondary)',
              border: '1px solid var(--theme-border-primary)',
              padding: '2px 7px', borderRadius: 4
            }}>
              {toolName}
            </span>
          )}
          {detail && (
            <span style={{
              fontSize: 12, color: 'var(--theme-text-secondary)',
              fontStyle: prompt ? 'italic' : 'normal',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              maxWidth: 400
            }}>{detail}</span>
          )}
        </div>

        {/* Expanded payload */}
        {expanded && (
          <pre className="payload-json">{JSON.stringify(event.payload, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}

window.EventRow = EventRow;
