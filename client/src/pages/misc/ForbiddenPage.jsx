import { Link } from 'react-router-dom';

export function ForbiddenPage() {
  return (
    <section className="flex min-h-[60vh] items-center justify-center px-4 text-center">
      <div className="mx-auto flex max-w-lg flex-col items-center rounded-2xl border border-fg/10 bg-bg/70 p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted">
          Error 403
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-fg">Access denied</h1>
        <p className="mt-3 max-w-md text-sm text-muted">
          You do not have permission to view this page. If you believe this is a mistake,
          contact an administrator.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          Go home
        </Link>
      </div>
    </section>
  );
}

export default ForbiddenPage;
