import clsx from 'clsx';

import { usePreferences } from '../../context/PreferencesContext.jsx';

const NOTIFICATION_OPTIONS = [
  {
    key: 'notifications.commentOnSnippet',
    label: 'Comments on my snippets',
    description: 'Save your preference for future comment notifications by email or in-app delivery.',
  },
  {
    key: 'notifications.snippetForked',
    label: 'Snippet forks',
    description: 'Save your preference for future notifications when another user forks your snippet.',
  },
  {
    key: 'notifications.productUpdates',
    label: 'Product updates',
    description: 'Opt in to future CodeNest product news and release announcements.',
  },
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

function InfoBanner({ children }) {
  return (
    <div className="rounded-2xl border border-accent/20 bg-accent/10 px-4 py-3 text-sm leading-6 text-fg">
      {children}
    </div>
  );
}

function Toggle({ label, description, checked, onChange }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-fg/10 bg-fg/2 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-fg">{label}</p>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={clsx(
          'relative h-7 w-12 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent/30',
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

export function NotificationsSettingsPage() {
  const { prefs, updatePref } = usePreferences();

  function savePreference(key) {
    return (value) => {
      void updatePref(key, value);
    };
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-fg">Notifications</h1>
        <p className="mt-1 text-sm text-muted">
          Choose which product and activity updates you want to receive later.
        </p>
      </header>

      <InfoBanner>
        Notification delivery is not yet implemented; your preferences are saved for when it ships.
      </InfoBanner>

      <SettingsCard title="Notification preferences" description="Changes save automatically when you toggle an option.">
        <div className="grid gap-3">
          {NOTIFICATION_OPTIONS.map((option) => (
            <Toggle
              key={option.key}
              label={option.label}
              description={option.description}
              checked={Boolean(prefs.notifications?.[option.key.split('.')[1]])}
              onChange={savePreference(option.key)}
            />
          ))}
        </div>
      </SettingsCard>
    </div>
  );
}

export default NotificationsSettingsPage;
