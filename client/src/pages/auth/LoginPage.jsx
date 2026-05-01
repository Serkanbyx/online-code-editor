import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext.jsx';
import AuthCard from '../../components/auth/AuthCard.jsx';
import PasswordField from '../../components/auth/PasswordField.jsx';
import FormField from '../../components/common/FormField.jsx';
import FormError from '../../components/common/FormError.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import extractApiError from '../../utils/apiError.js';
import { showSuccessToast } from '../../utils/helpers.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitizeNext(rawNext) {
  if (!rawNext || typeof rawNext !== 'string') return '/';
  // Only allow same-origin relative paths — prevents open-redirect abuse.
  if (!rawNext.startsWith('/') || rawNext.startsWith('//')) return '/';
  return rawNext;
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = useMemo(
    () => sanitizeNext(searchParams.get('next')),
    [searchParams],
  );
  const registerPath = useMemo(
    () => (nextPath === '/' ? '/register' : `/register?next=${encodeURIComponent(nextPath)}`),
    [nextPath],
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [clientErrors, setClientErrors] = useState({});
  const [serverMessage, setServerMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function validateClient() {
    const errors = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      errors.email = 'Email is required.';
    } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
      errors.email = 'Enter a valid email address.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    }

    setClientErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    setServerMessage('');
    setFieldErrors({});

    if (!validateClient()) return;

    setSubmitting(true);
    try {
      const user = await login({ email: email.trim().toLowerCase(), password });
      showSuccessToast(`Welcome back, ${user?.displayName ?? user?.username ?? ''}!`.trim());
      navigate(nextPath, { replace: true });
    } catch (error) {
      const normalized = extractApiError(error, 'Could not sign you in. Please try again.');
      setServerMessage(normalized.message);
      setFieldErrors(normalized.fieldErrors);
    } finally {
      setSubmitting(false);
    }
  }

  const emailError = fieldErrors.email ?? clientErrors.email;
  const passwordError = fieldErrors.password ?? clientErrors.password;

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to continue to CodeNest."
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link to={registerPath} className="font-medium text-accent hover:underline">
            Register
          </Link>
        </>
      }
    >
      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-4"
        aria-describedby={serverMessage ? 'login-server-error' : undefined}
      >
        {serverMessage ? (
          <div id="login-server-error">
            <FormError message={serverMessage} />
          </div>
        ) : null}

        <FormField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={emailError}
        />

        <div className="flex flex-col gap-1.5">
          <PasswordField
            label="Password"
            name="password"
            autoComplete="current-password"
            required
            placeholder="Your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={passwordError}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? (
            <>
              <Spinner size="sm" label="Signing in" />
              <span>Signing in…</span>
            </>
          ) : (
            <span>Sign in</span>
          )}
        </button>
      </form>
    </AuthCard>
  );
}

export default LoginPage;
