export function PagePlaceholder({ title, description, step }) {
  return (
    <section className="rounded-2xl border border-dashed border-fg/15 bg-bg/60 p-8">
      {step ? (
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
          {step}
        </p>
      ) : null}
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-fg">{title}</h1>
      {description ? (
        <p className="mt-2 max-w-2xl text-sm text-muted">{description}</p>
      ) : null}
    </section>
  );
}

export default PagePlaceholder;
