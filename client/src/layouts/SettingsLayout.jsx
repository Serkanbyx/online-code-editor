import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';

const SETTINGS_NAV_ITEMS = [
  { to: '/settings/profile', label: 'Profile' },
  { to: '/settings/account', label: 'Account' },
  { to: '/settings/appearance', label: 'Appearance' },
  { to: '/settings/editor', label: 'Editor' },
  { to: '/settings/privacy', label: 'Privacy' },
  { to: '/settings/notifications', label: 'Notifications' },
];

function sideLinkClass({ isActive }) {
  return clsx(
    'rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-accent/10 text-accent' : 'text-muted hover:bg-fg/5 hover:text-fg',
  );
}

export function SettingsLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const activeItem =
    SETTINGS_NAV_ITEMS.find((item) => location.pathname.startsWith(item.to))?.to ??
    SETTINGS_NAV_ITEMS[0].to;

  return (
    <section aria-labelledby="settings-heading" className="flex flex-col gap-6">
      <header>
        <h1 id="settings-heading" className="text-2xl font-semibold tracking-tight">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted">
          Manage your profile, editor experience and notification preferences.
        </p>
      </header>

      <div className="md:hidden">
        <label htmlFor="settings-nav-select" className="sr-only">
          Select settings section
        </label>
        <select
          id="settings-nav-select"
          value={activeItem}
          onChange={(event) => navigate(event.target.value)}
          className="w-full rounded-md border border-fg/10 bg-bg px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          {SETTINGS_NAV_ITEMS.map((item) => (
            <option key={item.to} value={item.to}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-6 md:grid-cols-[13rem_1fr]">
        <aside className="hidden md:block">
          <nav
            aria-label="Settings navigation"
            className="sticky top-20 flex flex-col gap-1 rounded-lg border border-fg/10 bg-bg/60 p-2"
          >
            {SETTINGS_NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} className={sideLinkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </section>
  );
}

export default SettingsLayout;
