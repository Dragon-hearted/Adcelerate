function FilterPanel({ filters, onChange, apps, sessions, eventTypes }) {
  const set = (k, v) => onChange({ ...filters, [k]: v });
  return (
    <div style={{
      padding: '12px 16px',
      background: 'var(--theme-bg-primary)',
      borderBottom: '1px solid var(--theme-border-primary)',
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 12
    }}>
      <FilterField label="Source App" value={filters.sourceApp} options={apps} onChange={v => set('sourceApp', v)} />
      <FilterField label="Session ID" value={filters.sessionId} options={sessions} onChange={v => set('sessionId', v)} />
      <FilterField label="Event Type" value={filters.eventType} options={eventTypes} onChange={v => set('eventType', v)} />
      <FilterField label="Team" value={filters.team} options={[]} onChange={v => set('team', v)} placeholder="All teams" />
    </div>
  );
}

function FilterField({ label, value, options, onChange, placeholder }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{
        fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: '0.04em',
        color: 'var(--theme-text-tertiary)'
      }}>{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="filter-select"
      >
        <option value="">{placeholder || `All ${label.toLowerCase()}`}</option>
        {options.map(o => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

window.FilterPanel = FilterPanel;
