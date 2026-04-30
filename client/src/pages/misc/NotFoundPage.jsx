import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <section className="flex min-h-[60vh] items-center justify-center px-4 text-center">
      <div className="mx-auto flex max-w-lg flex-col items-center rounded-2xl border border-fg/10 bg-bg/70 p-8 shadow-sm">
        <p className="text-7xl font-semibold tracking-tight text-accent sm:text-8xl">404</p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-fg">Page not found</h1>
        <p className="mt-3 max-w-md text-sm text-muted">
          We couldn't find the page you're looking for.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
          >
            Go home
          </Link>
          <Link
            to="/?sort=mostViewed"
            className="inline-flex items-center justify-center rounded-md border border-accent/20 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/10"
          >
            Browse snippets
          </Link>
        </div>
      </div>
    </section>
  );
}

export default NotFoundPage;
