export const EDITOR_DEFAULT_OPTIONS = Object.freeze({
  automaticLayout: true,
  scrollBeyondLastLine: false,
  smoothScrolling: true,
  renderWhitespace: 'selection',
  bracketPairColorization: { enabled: true },
  guides: { bracketPairs: true, indentation: true },
  padding: { top: 12, bottom: 12 },
});

export const EDITOR_VIEWER_OPTIONS = Object.freeze({
  ...EDITOR_DEFAULT_OPTIONS,
  readOnly: true,
  domReadOnly: true,
  contextmenu: false,
});

export const STATUS_COLORS = Object.freeze({
  active: 'bg-success/10 text-success',
  banned: 'bg-danger/10 text-danger',
  dismissed: 'bg-fg/5 text-muted',
  hidden: 'bg-accent/10 text-accent',
  open: 'bg-accent/10 text-accent',
  removed: 'bg-danger/10 text-danger',
  resolved: 'bg-success/10 text-success',
});

export const LANGUAGE_COLORS = Object.freeze({
  javascript: '#f7df1e',
  typescript: '#3178c6',
  python: '#3776ab',
  java: '#f89820',
  c: '#283593',
  cpp: '#00599c',
  csharp: '#239120',
  go: '#00add8',
  rust: '#dea584',
  ruby: '#cc342d',
  php: '#777bb4',
  swift: '#fa7343',
  kotlin: '#a97bff',
  scala: '#dc322f',
  r: '#276dc3',
  dart: '#0175c2',
  elixir: '#6e4a7e',
  perl: '#39457e',
  lua: '#000080',
  bash: '#4eaa25',
  sql: '#e38c00',
  html: '#e34c26',
  css: '#1572b6',
  json: '#8a8a8a',
  yaml: '#cb171e',
  markdown: '#083fa1',
});
