import ToggleSwitch from '../../components/common/ToggleSwitch.jsx';
import { usePreferences } from '../../context/PreferencesContext.jsx';

const PRIVACY_OPTIONS = [
  {
    key: 'privacy.showEmail',
    label: 'Show email',
    description: 'Allow visitors to see your email address on your public profile.',
  },
  {
    key: 'privacy.showLikedSnippets',
    label: 'Show liked snippets',
    description: 'Display the Liked tab and let visitors browse snippets you have liked.',
  },
  {
    key: 'privacy.showComments',
    label: 'Show comments',
    description: 'Display the Comments tab and let visitors read comments you have posted.',
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

export function PrivacySettingsPage() {
  const { prefs, updatePref } = usePreferences();

  function savePreference(key) {
    return (value) => {
      void updatePref(key, value);
    };
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-fg">Privacy</h1>
        <p className="mt-1 text-sm text-muted">
          Control what visitors can see when they open your public profile.
        </p>
      </header>

      <InfoBanner>
        These settings affect what visitors see on /u/&lt;your-username&gt;. Logged-in admins can still see all
        your content.
      </InfoBanner>

      <SettingsCard title="Public profile visibility" description="Changes save automatically when you toggle an option.">
        <div className="grid gap-3">
          {PRIVACY_OPTIONS.map((option) => (
            <ToggleSwitch
              key={option.key}
              label={option.label}
              description={option.description}
              checked={Boolean(prefs.privacy?.[option.key.split('.')[1]])}
              onChange={savePreference(option.key)}
            />
          ))}
        </div>
      </SettingsCard>
    </div>
  );
}

export default PrivacySettingsPage;
