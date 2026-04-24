const THEMES = [
  { id: 'paper', name: 'Paper', swatches: ['#EEE6D4', '#F5EEDC', '#8B2A1D', '#0F5C3E'] },
  { id: 'dark', name: 'Dark', swatches: ['#111827', '#1F2937', '#60A5FA', '#34D399'] },
  { id: 'midnight-purple', name: 'Midnight Purple', swatches: ['#0F0A1A', '#1E1B2E', '#A78BFA', '#C4B5FD'] },
  { id: 'dark-blue', name: 'Dark Blue', swatches: ['#0B1220', '#111A2E', '#60A5FA', '#38BDF8'] },
  { id: 'ocean', name: 'Ocean', swatches: ['#0C2C3D', '#12405A', '#5EEAD4', '#38BDF8'] },
  { id: 'modern', name: 'Modern', swatches: ['#18181B', '#27272A', '#E4E4E7', '#A1A1AA'] },
  { id: 'earth', name: 'Earth', swatches: ['#2A241D', '#3D342A', '#D4A373', '#E9C8A0'] },
  { id: 'high-contrast', name: 'High Contrast', swatches: ['#000000', '#1A1A1A', '#FFFFFF', '#FFD60A'] },
  { id: 'light', name: 'Light', swatches: ['#F9FAFB', '#FFFFFF', '#2563EB', '#059669'] },
  { id: 'mint-fresh', name: 'Mint Fresh', swatches: ['#F0FDF4', '#DCFCE7', '#10B981', '#059669'] },
  { id: 'sunset-orange', name: 'Sunset Orange', swatches: ['#1F1109', '#2E1A0F', '#F97316', '#FBBF24'] },
  { id: 'colorblind-friendly', name: 'Colorblind Friendly', swatches: ['#F5F5F5', '#E8E8E8', '#0173B2', '#DE8F05'] },
  { id: 'glass', name: 'Glass', swatches: ['#1a1a2e', '#2a2a3e', '#e94560', '#0f3460'] }
];

function ThemeManager({ open, current, onPick, onClose }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-hdr">
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--theme-text-primary)' }}>Theme</h2>
          <button onClick={onClose} className="modal-close"><IconClose size={16} /></button>
        </div>
        <div className="modal-body">
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10
          }}>
            {THEMES.map(t => (
              <button
                key={t.id}
                className={`theme-card ${current === t.id ? 'theme-card-on' : ''}`}
                onClick={() => onPick(t.id)}
              >
                <div style={{ display: 'flex', gap: 3, marginBottom: 8 }}>
                  {t.swatches.map((s, i) => (
                    <div key={i} style={{
                      flex: 1, height: 24, borderRadius: 4, background: s,
                      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.05)'
                    }} />
                  ))}
                </div>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--theme-text-primary)', textAlign: 'left' }}>
                  {t.name}
                </div>
                <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--theme-text-quaternary)', textAlign: 'left' }}>
                  {t.id}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

window.ThemeManager = ThemeManager;
window.THEMES = THEMES;
