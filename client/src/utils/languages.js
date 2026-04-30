import { LANGUAGE_COLORS } from './constants.js';

export { LANGUAGE_COLORS };

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
