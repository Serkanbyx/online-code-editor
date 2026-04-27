import { useState } from 'react';
import clsx from 'clsx';

import FormField from '../common/FormField.jsx';

function EyeIcon({ open }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {open ? (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.8 20.8 0 0 1 5.06-5.94" />
          <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a20.8 20.8 0 0 1-3.17 4.19" />
          <path d="M9.88 9.88a3 3 0 0 0 4.24 4.24" />
          <path d="M1 1l22 22" />
        </>
      )}
    </svg>
  );
}

export function PasswordField({
  label,
  value,
  onChange,
  error,
  hint,
  autoComplete = 'current-password',
  name = 'password',
  id,
  required,
  placeholder,
  className,
}) {
  const [visible, setVisible] = useState(false);

  return (
    <FormField label={label} error={error} hint={hint} id={id} className={className}>
      {({ id: fieldId, 'aria-invalid': ariaInvalid, 'aria-describedby': ariaDescribedBy }) => (
        <div className="relative">
          <input
            id={fieldId}
            name={name}
            type={visible ? 'text' : 'password'}
            value={value}
            onChange={onChange}
            autoComplete={autoComplete}
            required={required}
            placeholder={placeholder}
            aria-invalid={ariaInvalid}
            aria-describedby={ariaDescribedBy}
            className={clsx(
              'w-full rounded-md border bg-bg/60 px-3 py-2 pr-10 text-sm text-fg placeholder:text-muted',
              'transition-colors focus:outline-none focus:ring-2',
              error
                ? 'border-danger/60 focus:border-danger focus:ring-danger/30'
                : 'border-fg/10 focus:border-accent focus:ring-accent/30',
            )}
          />
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
            className="absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-muted transition-colors hover:bg-fg/5 hover:text-fg focus:outline-none focus:ring-2 focus:ring-accent/30"
            tabIndex={0}
          >
            <EyeIcon open={visible} />
          </button>
        </div>
      )}
    </FormField>
  );
}

export default PasswordField;
