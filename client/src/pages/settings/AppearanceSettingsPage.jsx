import clsx from 'clsx';

import { usePreferences } from '../../context/PreferencesContext.jsx';

const THEME_OPTIONS = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'System', value: 'system' },
];

const FONT_SIZE_OPTIONS = [
  { label: 'Small', value: 'sm' },
  { label: 'Medium', value: 'md' },
  { label: 'Large', value: 'lg' },
];

const DENSITY_OPTIONS = [
  { label: 'Compact', value: 'compact' },
  { label: 'Comfortable', value: 'comfortable' },
  { label: 'Spacious', value: 'spacious' },
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
          const isSelected = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onChange(option.value)}
              className={clsx(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent/30',
                isSelected ? 'bg-accent text-white shadow-sm' : 'text-muted hover:bg-bg hover:text-fg',
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ToggleSwitch({ label, description, checked, onChange }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-fg/10 bg-fg/2 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-fg">{label}</p>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
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

function PreviewCard() {
  return (
    <div className="rounded-2xl border border-fg/10 bg-bg p-[calc(var(--space)*1.5)] shadow-sm">
      <div className="flex flex-col gap-(--space)">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-fg">Live preview</p>
            <p className="text-xs text-muted">Theme, density and UI font size are applied here.</p>
          </div>
          <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
            Preview
          </span>
        </div>

        <label className="grid gap-1.5 text-sm font-medium text-fg">
          Sample input
          <input
            type="text"
            readOnly
            value="console.log('Hello CodeNest')"
            className="rounded-md border border-fg/10 bg-bg px-3 py-2 text-sm text-fg shadow-sm focus:outline-none"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white shadow-sm"
          >
            Primary button
          </button>
          <button
            type="button"
            className="rounded-md border border-fg/10 bg-bg px-3 py-2 text-sm font-medium text-fg"
          >
            Secondary
          </button>
        </div>
      </div>
    </div>
  );
}

export function AppearanceSettingsPage() {
  const { prefs, updatePref, systemScheme } = usePreferences();

  function savePreference(key) {
    return (value) => {
      void updatePref(key, value);
    };
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-fg">Appearance</h1>
        <p className="mt-1 text-sm text-muted">
          Tune CodeNest visuals and preview the result before leaving settings.
        </p>
      </header>

      <SettingsCard
        title="Visual preferences"
        description={`System theme currently resolves to ${systemScheme}. Changes save automatically.`}
      >
        <div className="grid gap-5">
          <SegmentedControl
            label="Theme"
            value={prefs.theme}
            options={THEME_OPTIONS}
            onChange={savePreference('theme')}
          />
          <SegmentedControl
            label="Font size"
            value={prefs.uiFontSize}
            options={FONT_SIZE_OPTIONS}
            onChange={savePreference('uiFontSize')}
          />
          <SegmentedControl
            label="Density"
            value={prefs.density}
            options={DENSITY_OPTIONS}
            onChange={savePreference('density')}
          />
          <ToggleSwitch
            label="Animations"
            description="Turn this off to remove transitions and motion across the interface."
            checked={prefs.animations}
            onChange={savePreference('animations')}
          />
        </div>
      </SettingsCard>

      <PreviewCard />
    </div>
  );
}

export default AppearanceSettingsPage;
