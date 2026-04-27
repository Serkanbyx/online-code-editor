import { forwardRef, useId } from 'react';
import clsx from 'clsx';

/**
 * Labeled input with hint + error slots. The control area accepts either a
 * children render-prop (for custom inputs like password + toggle button) or
 * renders a plain <input> when no children are provided.
 */
export const FormField = forwardRef(function FormField(
  {
    label,
    hint,
    error,
    className,
    inputClassName,
    children,
    id: providedId,
    ...inputProps
  },
  ref,
) {
  const reactId = useId();
  const id = providedId ?? `field-${reactId}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  const controlProps = {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
  };

  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      {label ? (
        <label htmlFor={id} className="text-sm font-medium text-fg">
          {label}
        </label>
      ) : null}

      {typeof children === 'function' ? (
        children({ ...controlProps, ref })
      ) : (
        <input
          ref={ref}
          {...controlProps}
          {...inputProps}
          className={clsx(
            'w-full rounded-md border bg-bg/60 px-3 py-2 text-sm text-fg placeholder:text-muted',
            'transition-colors focus:outline-none focus:ring-2',
            error
              ? 'border-danger/60 focus:border-danger focus:ring-danger/30'
              : 'border-fg/10 focus:border-accent focus:ring-accent/30',
            inputClassName,
          )}
        />
      )}

      {hint && !error ? (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
});

export default FormField;
