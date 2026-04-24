function LivePulseChart({ events, timeRange, onTimeRange, apps }) {
  // Build histogram buckets — sized to time range.
  const ranges = { '1m': 60_000, '3m': 180_000, '5m': 300_000 };
  const windowMs = ranges[timeRange];
  const bucketCount = 40;
  const bucketSize = windowMs / bucketCount;
  const now = Date.now();
  const start = now - windowMs;

  const buckets = React.useMemo(() => {
    const arr = Array.from({ length: bucketCount }, () => ({ total: 0, byApp: {} }));
    events.forEach(ev => {
      if (ev.timestamp < start || ev.timestamp > now) return;
      const idx = Math.min(bucketCount - 1, Math.floor((ev.timestamp - start) / bucketSize));
      arr[idx].total += 1;
      arr[idx].byApp[ev.source_app] = (arr[idx].byApp[ev.source_app] || 0) + 1;
    });
    return arr;
  }, [events, timeRange]);

  const max = Math.max(1, ...buckets.map(b => b.total));

  return (
    <div style={{
      padding: '12px 16px',
      background: 'var(--theme-bg-primary)',
      borderBottom: '1px solid var(--theme-border-primary)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--theme-text-primary)' }}>Live pulse</span>
          <span style={{ fontSize: 11, color: 'var(--theme-text-tertiary)', fontFamily: 'var(--font-mono)' }}>
            {events.length} events · window {timeRange}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 2, background: 'var(--theme-bg-tertiary)', borderRadius: 6, padding: 2 }}>
          {['1m', '3m', '5m'].map(r => (
            <button
              key={r}
              onClick={() => onTimeRange(r)}
              className={`range-btn ${timeRange === r ? 'range-btn-on' : ''}`}
            >{r}</button>
          ))}
        </div>
      </div>

      {/* Bars */}
      <div style={{
        display: 'flex', alignItems: 'flex-end',
        gap: 2, height: 80,
        padding: '0 2px',
        borderBottom: '1px solid var(--theme-border-secondary)'
      }}>
        {buckets.map((b, i) => {
          const segs = Object.entries(b.byApp);
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column-reverse', height: '100%', gap: 1 }}>
              {segs.map(([app, count]) => (
                <div key={app} style={{
                  height: `${(count / max) * 100}%`,
                  background: hashApp(app),
                  minHeight: count > 0 ? 2 : 0,
                  borderRadius: 1,
                  opacity: .7
                }} />
              ))}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
        {apps.map(a => (
          <span key={a} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--theme-text-tertiary)' }}>
            <span style={{ width: 8, height: 8, borderRadius: 9999, background: hashApp(a) }}></span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{a}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

window.LivePulseChart = LivePulseChart;
