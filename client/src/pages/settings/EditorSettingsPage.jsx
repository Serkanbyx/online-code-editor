import Editor from '@monaco-editor/react';
import clsx from 'clsx';
import { useMemo } from 'react';

import { usePreferences } from '../../context/PreferencesContext.jsx';
import { EDITOR_VIEWER_OPTIONS } from '../../utils/constants.js';

const SAMPLE_CODE = `function formatSnippetTitle(title) {
  const normalizedTitle = title.trim().replace(/\\s+/g, ' ');
  const label = normalizedTitle || 'Untitled snippet';

  return label.length > 42
    ? \`\${label.slice(0, 39)}...\`
    : label;
}

const message = 'Tabs, spaces, wrapping, and font choices update instantly.';
console.log(formatSnippetTitle(message));`;

const EDITOR_THEME_OPTIONS = [
  { label: 'Visual Studio', value: 'vs' },
  { label: 'Visual Studio Dark', value: 'vs-dark' },
  { label: 'High Contrast Dark', value: 'hc-black' },
  { label: 'High Contrast Light', value: 'hc-light' },
];

const FONT_FAMILY_OPTIONS = ['Fira Code', 'JetBrains Mono', 'Source Code Pro', 'Menlo', 'Consolas'];
const FONT_SIZE_OPTIONS = [12, 14, 16, 18, 20, 24];
const TAB_SIZE_OPTIONS = [2, 4, 8];
const LINE_NUMBER_OPTIONS = [
  { label: 'On', value: 'on' },
  { label: 'Off', value: 'off' },
  { label: 'Relative', value: 'relative' },
];
const KEYMAP_OPTIONS = [
  { label: 'Default', value: 'default' },
  { label: 'Vim', value: 'vim' },
  { label: 'Emacs', value: 'emacs' },
];

function SettingsCard({ title, description, children }) {
  return (
    <section className="rounded-2xl border border-fg/10 bg-bg/70 p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-fg">{title}</h2>
      {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function HelpTooltip({ text }) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label={text}
        className="grid h-5 w-5 place-items-center rounded-full border border-fg/10 text-xs font-semibold text-muted transition-colors hover:border-accent/40 hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
      >
        ?
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-60 -translate-x-1/2 rounded-md border border-fg/10 bg-bg px-3 py-2 text-xs font-normal leading-5 text-muted shadow-lg group-hover:block group-focus-within:block"
      >
        {text}
      </span>
    </span>
  );
}

function SelectControl({ label, value, options, onChange, tooltip }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-fg">
      <span className="flex items-center gap-2">
        {label}
        {tooltip ? <HelpTooltip text={tooltip} /> : null}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-fg/10 bg-bg px-3 py-2 text-sm text-fg transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
      >
        {options.map((option) => {
          const normalizedOption =
            typeof option === 'string' ? { label: option, value: option } : option;

          return (
            <option key={normalizedOption.value} value={normalizedOption.value}>
              {normalizedOption.label}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function SegmentedControl({ label, value, options, onChange }) {
  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium text-fg">{label}</span>
      <div
        role="group"
        aria-label={label}
        className="inline-flex w-fit flex-wrap gap-1 rounded-xl border border-fg/10 bg-fg/5 p-1"
      >
        {options.map((option) => {
          const normalizedOption =
            typeof option === 'number'
              ? { label: String(option), value: option }
              : option;
          const isSelected = normalizedOption.value === value;

          return (
            <button
              key={normalizedOption.value}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onChange(normalizedOption.value)}
              className={clsx(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent/30',
                isSelected ? 'bg-accent text-white shadow-sm' : 'text-muted hover:bg-bg hover:text-fg',
              )}
            >
              {normalizedOption.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ToggleSwitch({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-fg/10 bg-fg/2 p-4">
      <span className="text-sm font-medium text-fg">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={clsx(
          'relative h-7 w-12 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent/30',
          checked ? 'bg-accent' : 'bg-fg/20',
        )}
      >
        <span className="sr-only">{label}</span>
        <span
          className={clsx(
            'absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1',
          )}
        />
      </button>
    </div>
  );
}

export function EditorSettingsPage() {
  const { prefs, updatePref } = usePreferences();

  const previewOptions = useMemo(
    () => ({
      ...EDITOR_VIEWER_OPTIONS,
      fontSize: prefs.fontSize,
      fontFamily: prefs.fontFamily,
      tabSize: prefs.tabSize,
      wordWrap: prefs.wordWrap,
      minimap: { enabled: prefs.minimap },
      lineNumbers: prefs.lineNumbers,
    }),
    [prefs.fontFamily, prefs.fontSize, prefs.lineNumbers, prefs.minimap, prefs.tabSize, prefs.wordWrap],
  );

  function savePreference(key) {
    return (value) => {
      void updatePref(key, value);
    };
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-fg">Editor</h1>
        <p className="mt-1 text-sm text-muted">
          Customize Monaco behavior and verify changes in the live preview.
        </p>
      </header>

      <SettingsCard title="Editor preferences" description="Changes save automatically as you update each control.">
        <div className="grid gap-5 lg:grid-cols-2">
          <SelectControl
            label="Editor theme"
            value={prefs.editorTheme}
            options={EDITOR_THEME_OPTIONS}
            onChange={savePreference('editorTheme')}
          />
          <SelectControl
            label="Font family"
            value={prefs.fontFamily}
            options={FONT_FAMILY_OPTIONS}
            onChange={savePreference('fontFamily')}
          />
          <SegmentedControl
            label="Font size"
            value={prefs.fontSize}
            options={FONT_SIZE_OPTIONS}
            onChange={savePreference('fontSize')}
          />
          <SegmentedControl
            label="Tab size"
            value={prefs.tabSize}
            options={TAB_SIZE_OPTIONS}
            onChange={savePreference('tabSize')}
          />
          <SegmentedControl
            label="Line numbers"
            value={prefs.lineNumbers}
            options={LINE_NUMBER_OPTIONS}
            onChange={savePreference('lineNumbers')}
          />
          <SelectControl
            label="Keymap"
            value={prefs.keymap}
            options={KEYMAP_OPTIONS}
            onChange={savePreference('keymap')}
            tooltip="This is a UI hint for now. Monaco keeps the default keybindings until keymap extensions are added."
          />
          <ToggleSwitch
            label="Word wrap"
            checked={prefs.wordWrap === 'on'}
            onChange={(checked) => savePreference('wordWrap')(checked ? 'on' : 'off')}
          />
          <ToggleSwitch
            label="Minimap"
            checked={prefs.minimap}
            onChange={savePreference('minimap')}
          />
        </div>
      </SettingsCard>

      <SettingsCard
        title="Live Monaco preview"
        description="The preview is read-only and updates instantly with your current editor preferences."
      >
        <div className="overflow-hidden rounded-xl border border-fg/10 bg-bg">
          <Editor
            height="220px"
            language="javascript"
            theme={prefs.editorTheme}
            value={SAMPLE_CODE}
            options={previewOptions}
            loading={<div className="grid h-[220px] place-items-center text-sm text-muted">Loading preview...</div>}
          />
        </div>
      </SettingsCard>
    </div>
  );
}

export default EditorSettingsPage;
