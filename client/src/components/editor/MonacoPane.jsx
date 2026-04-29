import Editor from '@monaco-editor/react';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { MonacoBinding } from 'y-monaco';

import { usePreferences } from '../../context/PreferencesContext.jsx';
import { EDITOR_DEFAULT_OPTIONS } from '../../utils/constants.js';

export const MonacoPane = forwardRef(function MonacoPane(
  { language, value, onChange, onMount, ytext, awareness },
  ref,
) {
  const { prefs, monacoOptions } = usePreferences();
  const bindingRef = useRef(null);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const [editorReady, setEditorReady] = useState(false);

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

  function destroyBinding() {
    bindingRef.current?.destroy();
    bindingRef.current = null;
  }

  function updateModelLanguage(nextLanguage) {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor?.getModel();

    if (!monaco || !model || !nextLanguage) return;
    monaco.editor.setModelLanguage(model, nextLanguage);
  }

  function handleMount(editor, monaco) {
    editorRef.current = editor;
    monacoRef.current = monaco;
    updateModelLanguage(language);
    setEditorReady(true);
    onMount?.(editor, monaco);
  }

  useEffect(() => {
    updateModelLanguage(language);
  }, [language]);

  useEffect(() => {
    const editor = editorRef.current;
    const model = editor?.getModel();

    if (!editorReady || !editor || !model || !ytext) {
      return undefined;
    }

    destroyBinding();
    bindingRef.current = new MonacoBinding(ytext, model, new Set([editor]), awareness ?? undefined);

    return destroyBinding;
  }, [awareness, editorReady, ytext]);

  return (
    <Editor
      height="100%"
      language={language}
      theme={prefs.editorTheme}
      defaultValue={value}
      onChange={(nextValue) => onChange?.(nextValue ?? '')}
      onMount={handleMount}
      options={editorOptions}
      loading={<div className="grid h-full place-items-center text-sm text-muted">Loading editor...</div>}
    />
  );
});

export default MonacoPane;
