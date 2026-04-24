function App() {
  const [events, setEvents] = React.useState(() => makeInitialEvents());
  const [showFilters, setShowFilters] = React.useState(false);
  const [showTheme, setShowTheme] = React.useState(false);
  const [theme, setTheme] = React.useState('paper');
  const [filters, setFilters] = React.useState({ sourceApp: '', sessionId: '', eventType: '', team: '' });
  const [timeRange, setTimeRange] = React.useState('5m');
  const [hitlResolution, setHitlResolution] = React.useState(null);
  const [isConnected, setIsConnected] = React.useState(true);

  // Apply theme to root — CSS scopes variables under `.theme-<name>`
  React.useEffect(() => {
    const root = document.documentElement;
    // Remove any existing theme-* class, add the new one
    root.className = root.className.split(/\s+/).filter(c => !c.startsWith('theme-')).join(' ');
    root.classList.add(`theme-${theme}`);
  }, [theme]);

  // Stream in new events every few seconds for a "live" feel.
  React.useEffect(() => {
    const id = setInterval(() => {
      setEvents(prev => [...prev, randomEvent()].slice(-200));
    }, 4200);
    return () => clearInterval(id);
  }, []);

  const apps = [...new Set(events.map(e => e.source_app))];
  const sessions = [...new Set(events.map(e => shortSession(e.session_id)))];
  const eventTypes = [...new Set(events.map(e => e.hook_event_type))];

  const hitlEvent = events.find(e => e.hook_event_type === 'PermissionRequest');

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--theme-bg-secondary)',
      color: 'var(--theme-text-primary)',
      fontFamily: 'var(--font-sans)'
    }}>
      <Header
        eventCount={events.length}
        isConnected={isConnected}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(v => !v)}
        onClear={() => { setEvents([]); setHitlResolution(null); }}
        onTheme={() => setShowTheme(true)}
      />
      {showFilters && (
        <FilterPanel
          filters={filters}
          onChange={setFilters}
          apps={apps}
          sessions={sessions}
          eventTypes={eventTypes}
        />
      )}
      <LivePulseChart
        events={events}
        timeRange={timeRange}
        onTimeRange={setTimeRange}
        apps={apps}
      />
      <EventTimeline
        events={events}
        filters={filters}
        hitlEvent={hitlEvent}
        hitlResolution={hitlResolution}
        onResolve={setHitlResolution}
      />
      <ThemeManager
        open={showTheme}
        current={theme}
        onPick={t => { setTheme(t); setShowTheme(false); }}
        onClose={() => setShowTheme(false)}
      />
    </div>
  );
}

window.App = App;
