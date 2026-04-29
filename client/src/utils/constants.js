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
