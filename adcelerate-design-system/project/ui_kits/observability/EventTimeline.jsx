function EventTimeline({ events, filters, hitlEvent, hitlResolution, onResolve, onRemoveHitl }) {
  const [expanded, setExpanded] = React.useState(new Set());
  const toggle = id => {
    const n = new Set(expanded);
    n.has(id) ? n.delete(id) : n.add(id);
    setExpanded(n);
  };

  const filtered = events.filter(e => {
    if (filters.sourceApp && e.source_app !== filters.sourceApp) return false;
    if (filters.sessionId && shortSession(e.session_id) !== filters.sessionId) return false;
    if (filters.eventType && e.hook_event_type !== filters.eventType) return false;
    return true;
  });

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '14px 16px', background: 'var(--theme-bg-secondary)' }}>
      {hitlEvent && (
        <HITLCard
          event={hitlEvent}
          resolution={hitlResolution}
          onApprove={() => onResolve('approve')}
          onDeny={() => onResolve('deny')}
        />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(ev => (
          <EventRow
            key={ev.id}
            event={ev}
            expanded={expanded.has(ev.id)}
            onToggle={() => toggle(ev.id)}
          />
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--theme-text-quaternary)', padding: 32, fontSize: 13 }}>
            No events match the current filters.
          </div>
        )}
      </div>
    </div>
  );
}

window.EventTimeline = EventTimeline;
