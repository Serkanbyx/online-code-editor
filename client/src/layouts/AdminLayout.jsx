import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';

import Avatar from '../components/common/Avatar.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const ADMIN_NAV_ITEMS = [
  { to: '/admin/dashboard', label: 'Dashboard' },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/snippets', label: 'Snippets' },
  { to: '/admin/comments', label: 'Comments' },
  { to: '/admin/reports', label: 'Reports' },
];

function sidebarLinkClass({ isActive }) {
  return clsx(
    'rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-accent/10 text-accent' : 'text-muted hover:bg-fg/5 hover:text-fg',
  );
}

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const activeItem =
    ADMIN_NAV_ITEMS.find((item) => location.pathname.startsWith(item.to))?.to ??
    ADMIN_NAV_ITEMS[0].to;

  return (
    <div className="flex min-h-screen flex-col bg-bg text-fg">
      <header className="border-b border-fg/10 bg-bg/85 backdrop-blur">
        <div className="container mx-auto flex min-h-16 items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              Admin Panel
            </p>
            <h1 className="text-lg font-semibold tracking-tight text-fg">CodeNest Control</h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="rounded-md border border-fg/10 bg-bg px-3 py-1.5 text-sm font-medium text-fg transition-colors hover:bg-fg/5"
            >
              View site
            </Link>
            <div className="hidden items-center gap-2 rounded-full border border-fg/10 bg-fg/5 py-1 pl-1 pr-3 sm:flex">
              <Avatar user={user} size="sm" />
              <span className="max-w-40 truncate text-sm font-medium text-fg">
                {user?.displayName || user?.username || 'Admin'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto w-full flex-1 px-4 py-6">
        <div className="mb-4 md:hidden">
          <label htmlFor="admin-nav-select" className="sr-only">
            Select admin section
          </label>
          <select
            id="admin-nav-select"
            value={activeItem}
            onChange={(event) => navigate(event.target.value)}
            className="w-full rounded-md border border-fg/10 bg-bg px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          >
            {ADMIN_NAV_ITEMS.map((item) => (
              <option key={item.to} value={item.to}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-6 md:grid-cols-[14rem_1fr]">
          <aside className="hidden md:block">
            <nav
              aria-label="Admin navigation"
              className="sticky top-20 flex flex-col gap-1 rounded-lg border border-fg/10 bg-bg/60 p-2"
            >
              <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.15em] text-muted">
                Admin
              </p>
              {ADMIN_NAV_ITEMS.map((item) => (
                <NavLink key={item.to} to={item.to} className={sidebarLinkClass}>
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </aside>

          <section className="min-w-0">
            <Outlet />
          </section>
        </div>
      </div>
    </div>
  );
}

export default AdminLayout;
