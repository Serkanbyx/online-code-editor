import { Link } from 'react-router-dom';

function BrandLogo() {
  return (
    <Link
      to="/"
      aria-label="CodeNest home"
      className="group inline-flex items-center gap-2 text-fg transition-colors hover:text-accent"
    >
      <span
        aria-hidden="true"
        className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent transition-transform group-hover:scale-105"
      >
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8 6 2 12l6 6" />
          <path d="m16 6 6 6-6 6" />
        </svg>
      </span>
      <span className="text-lg font-semibold tracking-tight">CodeNest</span>
    </Link>
  );
}

export function AuthCard({ title, subtitle, children, footer }) {
  return (
    <div className="relative flex min-h-[calc(100vh-10rem)] items-center justify-center py-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute left-1/2 top-0 h-80 w-160 -translate-x-1/2 rounded-full bg-accent/15 blur-3xl" />
      </div>

      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandLogo />
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-fg">{title}</h1>
          {subtitle ? (
            <p className="mt-2 text-sm text-muted">{subtitle}</p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-fg/10 bg-bg/80 p-6 shadow-sm backdrop-blur sm:p-8">
          {children}
        </div>

        {footer ? (
          <div className="mt-6 text-center text-sm text-muted">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}

export default AuthCard;
