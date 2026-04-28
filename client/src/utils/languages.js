export const SUPPORTED_LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'java',
  'c',
  'cpp',
  'csharp',
  'go',
  'rust',
  'ruby',
  'php',
  'swift',
  'kotlin',
  'scala',
  'r',
  'dart',
  'elixir',
  'perl',
  'lua',
  'bash',
  'sql',
  'html',
  'css',
  'json',
  'yaml',
  'markdown',
];

// Curated short list shown as quick filter chips on the explore page.
export const TOP_LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'java',
  'cpp',
  'go',
  'rust',
  'php',
];

export const LANGUAGE_COLORS = {
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
};

const LANGUAGE_LABELS = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  java: 'Java',
  c: 'C',
  cpp: 'C++',
  csharp: 'C#',
  go: 'Go',
  rust: 'Rust',
  ruby: 'Ruby',
  php: 'PHP',
  swift: 'Swift',
  kotlin: 'Kotlin',
  scala: 'Scala',
  r: 'R',
  dart: 'Dart',
  elixir: 'Elixir',
  perl: 'Perl',
  lua: 'Lua',
  bash: 'Bash',
  sql: 'SQL',
  html: 'HTML',
  css: 'CSS',
  json: 'JSON',
  yaml: 'YAML',
  markdown: 'Markdown',
};

const FALLBACK_COLOR = '#94a3b8';

export function getLanguageLabel(language) {
  if (!language) return 'Unknown';
  return LANGUAGE_LABELS[language] ?? language.charAt(0).toUpperCase() + language.slice(1);
}

export function getLanguageColor(language) {
  return LANGUAGE_COLORS[language] ?? FALLBACK_COLOR;
}
