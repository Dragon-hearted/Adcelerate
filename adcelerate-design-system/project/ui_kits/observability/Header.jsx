function Header({ eventCount, isConnected, showFilters, onToggleFilters, onClear, onTheme }) {
  return (
    <header style={{
      background: 'var(--theme-bg-primary)',
      borderBottom: '1px solid var(--theme-border-primary)',
      boxShadow: '0 1px 3px var(--theme-shadow)'
    }}>
      <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--theme-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', flexShrink: 0
          }}>
            <IconChart size={20} stroke={2} />
          </div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--theme-text-primary)', whiteSpace: 'nowrap' }}>
            Multi-Agent Observability
          </h1>
        </div>

        {isConnected ? (
          <div className="pill-conn pill-ok">
            <span className="pulse-wrap">
              <span className="pulse-ping"></span>
              <span className="pulse-dot"></span>
            </span>
            <span>Connected</span>
          </div>
        ) : (
          <div className="pill-conn pill-err">
            <span className="pulse-dot" style={{ background: 'var(--theme-accent-error)' }}></span>
            <span>Disconnected</span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="count-pill">
            {eventCount} events
          </span>
          <button className="tb-btn" onClick={onClear} title="Clear events">
            <IconTrash />
            <span>Clear</span>
          </button>
          <button
            className={`tb-btn ${showFilters ? 'tb-btn-on' : ''}`}
            onClick={onToggleFilters}
            title={showFilters ? 'Hide filters' : 'Show filters'}
          >
            <IconFilter />
            <span>Filters</span>
          </button>
          <button className="tb-btn" onClick={onTheme} title="Open theme manager">
            <IconPalette />
            <span>Theme</span>
          </button>
        </div>
      </div>
    </header>
  );
}

window.Header = Header;
