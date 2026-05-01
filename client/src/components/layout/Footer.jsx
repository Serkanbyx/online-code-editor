import { Link } from 'react-router-dom';

const RESOURCE_LINKS = [
  { label: 'Documentation', href: 'https://github.com/', external: true },
  { label: 'GitHub', href: 'https://github.com/', external: true },
];

const LEGAL_LINKS = [
  { label: 'Privacy', to: '/' },
  { label: 'Terms', to: '/' },
];

const CREATOR_LINKS = [
  { label: 'Serkanby', href: 'https://serkanbayraktar.com/' },
  { label: 'Github', href: 'https://github.com/Serkanbyx' },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-10 border-t border-fg/10 bg-bg/70">
      <div className="container mx-auto grid gap-8 px-4 py-8 md:grid-cols-3">
        <div>
          <p className="text-sm font-semibold text-fg">CodeNest</p>
          <p className="mt-2 max-w-xs text-sm text-muted">
            Collaborative online code editor with real-time rooms, snippet sharing and rich
            preferences.
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted">
            Resources
          </p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {RESOURCE_LINKS.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-fg/80 transition-colors hover:text-fg"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted">Legal</p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {LEGAL_LINKS.map((link) => (
              <li key={link.label}>
                <Link to={link.to} className="text-fg/80 transition-colors hover:text-fg">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-fg/10">
        <div className="container mx-auto flex flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-muted md:flex-row">
          <p>© {year} CodeNest. All rights reserved.</p>
          <p className="sign flex flex-wrap items-center justify-center gap-1">
            <span>Created by</span>
            {CREATOR_LINKS.map((link, index) => (
              <span key={link.href} className="flex items-center gap-1">
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-fg/80 transition-colors hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent/40 focus:ring-offset-2 focus:ring-offset-bg"
                >
                  {link.label}
                </a>
                {index < CREATOR_LINKS.length - 1 && <span aria-hidden="true">|</span>}
              </span>
            ))}
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
