// Mock data modeled on the shape of HookEvent from apps/client/src/types.ts.
// Deterministic hashing mirrors useEventColors.ts.

// Desaturated, paper-friendly palette keyed off brand tokens
// (oxblood, petrol, amber, ink-green, cocoa, slate-blue, terracotta, forest)
// Muted paper-palette — each hex desaturated ~15% for paper harmony
const APP_PALETTE = [
  '#7A2519', '#1E5A7A', '#B56A0A', '#2D5E45',
  '#5C4A38', '#3E5F7D', '#94431E', '#3F6852',
  '#6E2116', '#7A5C2E'
];

function hashApp(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return APP_PALETTE[Math.abs(h) % APP_PALETTE.length];
}

const EVENT_EMOJI = {
  PreToolUse: '🔧', PostToolUse: '✅', PostToolUseFailure: '❌',
  PermissionRequest: '🔐', UserPromptSubmit: '💬',
  SessionStart: '🚀', SessionEnd: '🏁',
  SubagentStart: '🤖', SubagentStop: '🤖',
  PreCompact: '📦', Notification: '🔔', Stop: '⏹'
};

const TOOL_EMOJI = {
  Bash: '💻', Read: '📖', Edit: '✏️', Write: '💾',
  Grep: '🔎', Glob: '📁', Task: '🤖', WebFetch: '🌐',
  WebSearch: '🔍', Skill: '⚡'
};

// Event styles — semantic, paper-friendly. Uses brand tokens so the palette
// tracks any theme; `bg` is a soft tint, `fg` a legible ink color.
const EVENT_STYLES = {
  PostToolUse:        { bg: 'rgba(15,92,62,.12)',  fg: '#0F5C3E' },
  PostToolUseFailure: { bg: 'rgba(139,42,29,.12)', fg: '#8B2A1D' },
  PreToolUse:         { bg: 'rgba(30,90,122,.10)', fg: '#1E5A7A' },
  PermissionRequest:  { bg: 'rgba(180,83,9,.14)',  fg: '#B45309' },
  Stop:               { bg: 'rgba(139,42,29,.10)', fg: '#8B2A1D' },
  Notification:       { bg: 'rgba(30,90,122,.10)', fg: '#1E5A7A' },
  SubagentStart:      { bg: 'rgba(15,92,62,.10)',  fg: '#0F5C3E' },
  SubagentStop:       { bg: 'rgba(90,70,50,.12)',  fg: '#5A4632' },
  SessionStart:       { bg: 'rgba(15,92,62,.10)',  fg: '#0F5C3E' },
  SessionEnd:         { bg: 'rgba(90,70,50,.12)',  fg: '#5A4632' },
  UserPromptSubmit:   { bg: 'rgba(30,90,122,.10)', fg: '#1E5A7A' },
  PreCompact:         { bg: 'rgba(180,83,9,.10)',  fg: '#B45309' }
};

const SEED_EVENTS = [
  { source_app: 'pinboard', session_id: '7f0f56d290a14e8b', hook_event_type: 'SessionStart', t: -240000, payload: { source: 'startup' } },
  { source_app: 'pinboard', session_id: '7f0f56d290a14e8b', hook_event_type: 'UserPromptSubmit', t: -235000, payload: { prompt: 'Add the latest 40 reference images from the moodboard to the pinboard.' } },
  { source_app: 'pinboard', session_id: '7f0f56d290a14e8b', hook_event_type: 'PreToolUse', t: -220000, payload: { tool_name: 'Read', tool_input: { file_path: '/pinboard/reference-board.ts' } } },
  { source_app: 'pinboard', session_id: '7f0f56d290a14e8b', hook_event_type: 'PostToolUse', t: -219000, payload: { tool_name: 'Read', tool_input: { file_path: '/pinboard/reference-board.ts' } } },
  { source_app: 'instagram-scrapper', session_id: 'a1c9e2f0b2d7', hook_event_type: 'SessionStart', t: -180000, payload: { source: 'resume' } },
  { source_app: 'instagram-scrapper', session_id: 'a1c9e2f0b2d7', hook_event_type: 'UserPromptSubmit', t: -175000, payload: { prompt: 'Scrape the top 20 reels from @nike posted in the last week.' } },
  { source_app: 'instagram-scrapper', session_id: 'a1c9e2f0b2d7', hook_event_type: 'PreToolUse', t: -170000, payload: { tool_name: 'WebFetch', tool_input: { url: 'https://www.instagram.com/nike/reels/' } } },
  { source_app: 'instagram-scrapper', session_id: 'a1c9e2f0b2d7', hook_event_type: 'PostToolUseFailure', t: -168000, payload: { tool_name: 'WebFetch', tool_input: { url: 'https://www.instagram.com/nike/reels/' } } },
  { source_app: 'sceneboard', session_id: '3e5f72ab18c4', hook_event_type: 'SessionStart', t: -140000, payload: { source: 'startup' } },
  { source_app: 'sceneboard', session_id: '3e5f72ab18c4', hook_event_type: 'SubagentStart', t: -135000, payload: { agent_type: 'validator', agent_id: 'structural-validator@creative-team' } },
  { source_app: 'sceneboard', session_id: '3e5f72ab18c4', hook_event_type: 'PreToolUse', t: -125000, payload: { tool_name: 'Bash', tool_input: { command: 'sceneboard generate --brief brief.md --output board.json' } } },
  { source_app: 'autocaption', session_id: 'b0d4e8f31a96', hook_event_type: 'PreToolUse', t: -100000, payload: { tool_name: 'Bash', tool_input: { command: 'whisper-cpp -f src.wav -m ggml-large-v3.bin -oj' } } },
  { source_app: 'autocaption', session_id: 'b0d4e8f31a96', hook_event_type: 'PostToolUse', t: -96000, payload: { tool_name: 'Bash', tool_input: { command: 'whisper-cpp -f src.wav -m ggml-large-v3.bin -oj' } } },
  { source_app: 'pinboard', session_id: '7f0f56d290a14e8b', hook_event_type: 'PermissionRequest', t: -70000, payload: { tool_name: 'Bash', tool_input: { command: 'rm -rf node_modules/.cache' } } },
  { source_app: 'imageengine', session_id: 'c2a7b4d9e510', hook_event_type: 'PreToolUse', t: -50000, payload: { tool_name: 'WebFetch', tool_input: { url: 'https://api.nanobanana.ai/v1/generate' } } },
  { source_app: 'imageengine', session_id: 'c2a7b4d9e510', hook_event_type: 'PostToolUse', t: -40000, payload: { tool_name: 'WebFetch', tool_input: { url: 'https://api.nanobanana.ai/v1/generate' } } },
  { source_app: 'readmeengine', session_id: 'd8b3c1f07a22', hook_event_type: 'PreToolUse', t: -30000, payload: { tool_name: 'Edit', tool_input: { file_path: '/packages/readme-engine/src/svg/hero.ts' } } },
  { source_app: 'readmeengine', session_id: 'd8b3c1f07a22', hook_event_type: 'PostToolUse', t: -20000, payload: { tool_name: 'Edit', tool_input: { file_path: '/packages/readme-engine/src/svg/hero.ts' } } },
  { source_app: 'sceneboard', session_id: '3e5f72ab18c4', hook_event_type: 'SubagentStop', t: -10000, payload: { agent_type: 'validator', agent_id: 'structural-validator@creative-team' } }
];

function makeInitialEvents() {
  const base = Date.now();
  return SEED_EVENTS.map((e, i) => ({
    id: `evt-${i}`,
    timestamp: base + e.t,
    ...e
  }));
}

function randomEvent() {
  const apps = ['pinboard', 'instagram-scrapper', 'sceneboard', 'autocaption', 'imageengine', 'readmeengine'];
  const types = ['PreToolUse', 'PostToolUse', 'UserPromptSubmit', 'PostToolUseFailure'];
  const tools = ['Bash', 'Read', 'Edit', 'Grep', 'WebFetch', 'Task'];
  const app = apps[Math.floor(Math.random() * apps.length)];
  const type = types[Math.floor(Math.random() * types.length)];
  const tool = tools[Math.floor(Math.random() * tools.length)];
  return {
    id: `evt-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    source_app: app,
    session_id: Math.random().toString(16).slice(2, 14),
    hook_event_type: type,
    timestamp: Date.now(),
    payload: type === 'UserPromptSubmit'
      ? { prompt: 'Continue with the next step.' }
      : { tool_name: tool, tool_input: { command: `${tool.toLowerCase()} ...` } }
  };
}

function shortSession(id) { return id.slice(0, 8); }
function formatTime(ts) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
}
function toolDetail(ev) {
  const p = ev.payload || {};
  if (ev.hook_event_type === 'UserPromptSubmit' && p.prompt)
    return `"${p.prompt.slice(0,70)}${p.prompt.length > 70 ? '...' : ''}"`;
  if (ev.hook_event_type === 'SessionStart') {
    const s = p.source || 'unknown';
    return { startup: 'New session', resume: 'Resuming session', clear: 'Fresh session' }[s] || s;
  }
  const ti = p.tool_input;
  if (!ti) return null;
  if (ti.command) return ti.command.slice(0, 50) + (ti.command.length > 50 ? '...' : '');
  if (ti.file_path) return ti.file_path.split('/').pop();
  if (ti.url) return ti.url.slice(0, 60) + (ti.url.length > 60 ? '...' : '');
  return null;
}

Object.assign(window, {
  hashApp, EVENT_EMOJI, TOOL_EMOJI, EVENT_STYLES,
  makeInitialEvents, randomEvent, shortSession, formatTime, toolDetail
});
