import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';

import { useAuth } from '../../context/AuthContext.jsx';
import { useDebounce } from '../../hooks/useDebounce.js';

const DESKTOP_NAV_LINKS = [
  { to: '/', label: 'Explore', end: true },
  { to: '/rooms', label: 'Rooms' },
];

function navLinkClass({ isActive }) {
  return clsx(
    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
    isActive ? 'bg-fg/5 text-fg' : 'text-muted hover:bg-fg/5 hover:text-fg',
  );
}

function Logo() {
  return (
    <Link
      to="/"
      className="flex items-center gap-2 text-fg transition-colors hover:text-accent"
      aria-label="CodeNest home"
    >
      <span
        aria-hidden="true"
        className="grid h-8 w-8 place-items-center rounded-lg bg-accent/10 text-accent"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 6 2 12l6 6" />
          <path d="m16 6 6 6-6 6" />
        </svg>
      </span>
      <span className="text-base font-semibold tracking-tight">CodeNest</span>
    </Link>
  );
}

function SearchInput({ value, onChange, onSubmit, placeholder = 'Search snippets…', className }) {
  return (
    <form
      role="search"
      onSubmit={onSubmit}
      className={clsx('relative w-full', className)}
    >
      <label htmlFor="navbar-search" className="sr-only">
        Search snippets
      </label>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        id="navbar-search"
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-md border border-fg/10 bg-bg/60 py-1.5 pl-9 pr-3 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
      />
    </form>
  );
}

function AvatarButton({ user, onClick, isOpen }) {
  const initial = (user?.displayName ?? user?.username ?? '?').charAt(0).toUpperCase();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="menu"
      aria-expanded={isOpen}
      className="grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-fg/10 bg-fg/5 text-sm font-semibold text-fg transition-colors hover:bg-fg/10"
    >
      {user?.avatarUrl ? (
        <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden="true">{initial}</span>
      )}
      <span className="sr-only">Open account menu</span>
    </button>
  );
}

function MenuItem({ to, onClick, children, variant = 'default' }) {
  const className = clsx(
    'block w-full rounded-md px-3 py-2 text-left text-sm transition-colors',
    variant === 'danger'
      ? 'text-danger hover:bg-danger/10'
      : 'text-fg hover:bg-fg/5',
  );

  if (to) {
    return (
      <Link to={to} onClick={onClick} role="menuitem" className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} role="menuitem" className={className}>
      {children}
    </button>
  );
}

export function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const urlQuery = useMemo(
    () => (location.pathname === '/' ? searchParams.get('q') ?? '' : ''),
    [location.pathname, searchParams],
  );

  const [search, setSearch] = useState(urlQuery);
  const debouncedSearch = useDebounce(search, 300);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef(null);

  // Keep input synchronized with URL when navigating via other entry points
  // (e.g. clicking a chip on the explore page or using the back button).
  useEffect(() => {
    setSearch(urlQuery);
  }, [urlQuery]);

  // Debounced navigation: push `?q=` to home when the user is actively typing
  // and skip when the debounced value already matches the URL.
  useEffect(() => {
    const trimmed = debouncedSearch.trim();
    const currentQuery = searchParams.get('q') ?? '';

    if (location.pathname === '/' && trimmed === currentQuery) return;
    if (location.pathname !== '/' && trimmed === '') return;

    const target = trimmed ? `/?q=${encodeURIComponent(trimmed)}` : '/';
    navigate(target, { replace: location.pathname === '/' });
  }, [debouncedSearch]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    function handlePointer(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    function handleKey(event) {
      if (event.key === 'Escape') setMenuOpen(false);
    }

    window.addEventListener('mousedown', handlePointer);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handlePointer);
      window.removeEventListener('keydown', handleKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  function handleSearchSubmit(event) {
    event.preventDefault();
    const trimmed = search.trim();
    navigate(trimmed ? `/?q=${encodeURIComponent(trimmed)}` : '/');
  }

  function handleSignOut() {
    setMenuOpen(false);
    logout();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-fg/10 bg-bg/80 backdrop-blur">
      <nav className="container mx-auto flex h-14 items-center gap-3 px-4">
        <div className="flex items-center gap-4">
          <Logo />
          <div className="hidden items-center gap-1 md:flex">
            {DESKTOP_NAV_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={navLinkClass}>
                {link.label}
              </NavLink>
            ))}
          </div>
        </div>

        <div className="hidden flex-1 justify-center md:flex">
          <SearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onSubmit={handleSearchSubmit}
            className="max-w-sm"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <Link
                to="/rooms"
                className="hidden items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90 md:inline-flex"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </svg>
                New Room
              </Link>

              <div ref={menuRef} className="relative">
                <AvatarButton
                  user={user}
                  isOpen={menuOpen}
                  onClick={() => setMenuOpen((value) => !value)}
                />
                {menuOpen ? (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-56 rounded-lg border border-fg/10 bg-bg p-1 shadow-lg"
                  >
                    <div className="px-3 py-2">
                      <p className="truncate text-sm font-semibold text-fg">
                        {user?.displayName ?? user?.username}
                      </p>
                      {user?.username ? (
                        <p className="truncate text-xs text-muted">@{user.username}</p>
                      ) : null}
                    </div>
                    <div className="h-px bg-fg/10" />
                    <MenuItem to="/me/snippets" onClick={() => setMenuOpen(false)}>
                      My Snippets
                    </MenuItem>
                    {user?.username ? (
                      <MenuItem to={`/u/${user.username}`} onClick={() => setMenuOpen(false)}>
                        Profile
                      </MenuItem>
                    ) : null}
                    <MenuItem to="/settings/profile" onClick={() => setMenuOpen(false)}>
                      Settings
                    </MenuItem>
                    {isAdmin ? (
                      <MenuItem to="/admin/dashboard" onClick={() => setMenuOpen(false)}>
                        Admin Panel
                      </MenuItem>
                    ) : null}
                    <div className="my-1 h-px bg-fg/10" />
                    <MenuItem onClick={handleSignOut} variant="danger">
                      Sign out
                    </MenuItem>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link
                to="/login"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-fg transition-colors hover:bg-fg/5"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
              >
                Register
              </Link>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((value) => !value)}
            aria-expanded={mobileOpen}
            aria-controls="navbar-mobile-panel"
            className="grid h-9 w-9 place-items-center rounded-md border border-fg/10 text-fg transition-colors hover:bg-fg/5 md:hidden"
          >
            <span className="sr-only">Toggle navigation</span>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {mobileOpen ? (
                <>
                  <path d="M6 6l12 12" />
                  <path d="M6 18L18 6" />
                </>
              ) : (
                <>
                  <path d="M4 6h16" />
                  <path d="M4 12h16" />
                  <path d="M4 18h16" />
                </>
              )}
            </svg>
          </button>
        </div>
      </nav>

      {mobileOpen ? (
        <div
          id="navbar-mobile-panel"
          className="border-t border-fg/10 bg-bg md:hidden"
        >
          <div className="container mx-auto flex flex-col gap-3 px-4 py-4">
            <SearchInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onSubmit={handleSearchSubmit}
            />
            <div className="flex flex-col">
              {DESKTOP_NAV_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    clsx(
                      'rounded-md px-3 py-2 text-sm font-medium',
                      isActive ? 'bg-fg/5 text-fg' : 'text-muted hover:bg-fg/5 hover:text-fg',
                    )
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </div>
            <div className="h-px bg-fg/10" />
            {isAuthenticated ? (
              <div className="flex flex-col">
                <Link to="/rooms" className="rounded-md px-3 py-2 text-sm text-fg hover:bg-fg/5">
                  New Room
                </Link>
                <Link to="/me/snippets" className="rounded-md px-3 py-2 text-sm text-fg hover:bg-fg/5">
                  My Snippets
                </Link>
                {user?.username ? (
                  <Link
                    to={`/u/${user.username}`}
                    className="rounded-md px-3 py-2 text-sm text-fg hover:bg-fg/5"
                  >
                    Profile
                  </Link>
                ) : null}
                <Link to="/settings/profile" className="rounded-md px-3 py-2 text-sm text-fg hover:bg-fg/5">
                  Settings
                </Link>
                {isAdmin ? (
                  <Link to="/admin/dashboard" className="rounded-md px-3 py-2 text-sm text-fg hover:bg-fg/5">
                    Admin Panel
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="rounded-md px-3 py-2 text-left text-sm text-danger hover:bg-danger/10"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  to="/login"
                  className="rounded-md border border-fg/10 px-3 py-2 text-center text-sm font-medium text-fg hover:bg-fg/5"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="rounded-md bg-accent px-3 py-2 text-center text-sm font-medium text-white hover:bg-accent/90"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}

export default Navbar;
