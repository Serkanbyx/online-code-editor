import { Link } from 'react-router-dom';

export function ForbiddenPage() {
  return (
    <section className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted">
        Error 403
      </p>
      <h1 className="text-4xl font-semibold tracking-tight">Access denied</h1>
      <p className="max-w-md text-sm text-muted">
        You do not have permission to view this page. If you believe this is a mistake,
        contact an administrator.
      </p>
      <Link
        to="/"
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
      >
        Back to home
      </Link>
    </section>
  );
}

export default ForbiddenPage;
