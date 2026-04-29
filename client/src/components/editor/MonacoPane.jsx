import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import Editor from '@monaco-editor/react';

import { usePreferences } from '../../context/PreferencesContext.jsx';
import { EDITOR_DEFAULT_OPTIONS } from '../../utils/constants.js';

export const MonacoPane = forwardRef(function MonacoPane(
  { language, value, onChange, onMount },
  ref,
) {
  const { prefs, monacoOptions } = usePreferences();
  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  const editorOptions = useMemo(
    () => ({
      ...monacoOptions,
      ...EDITOR_DEFAULT_OPTIONS,
      readOnly: false,
    }),
    [monacoOptions],
  );

  useImperativeHandle(
    ref,
    () => ({
      get editor() {
        return editorRef.current;
      },
      get monaco() {
        return monacoRef.current;
      },
    }),
    [],
  );

  function handleMount(editor, monaco) {
    editorRef.current = editor;
    monacoRef.current = monaco;
    onMount?.(editor, monaco);
  }

  return (
    <Editor
      height="100%"
      language={language}
      theme={prefs.editorTheme}
      value={value}
      onChange={(nextValue) => onChange?.(nextValue ?? '')}
      onMount={handleMount}
      options={editorOptions}
      loading={<div className="grid h-full place-items-center text-sm text-muted">Loading editor...</div>}
    />
  );
});

export default MonacoPane;
