import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext.jsx';
import AuthCard from '../../components/auth/AuthCard.jsx';
import PasswordField from '../../components/auth/PasswordField.jsx';
import PasswordStrengthMeter, {
  scorePassword,
} from '../../components/auth/PasswordStrengthMeter.jsx';
import FormField from '../../components/common/FormField.jsx';
import FormError from '../../components/common/FormError.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import extractApiError from '../../utils/apiError.js';
import { showSuccessToast } from '../../utils/helpers.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/;

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: '',
    displayName: '',
    email: '',
    password: '',
    passwordConfirm: '',
  });
  const [clientErrors, setClientErrors] = useState({});
  const [serverMessage, setServerMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const passwordScore = useMemo(() => scorePassword(form.password), [form.password]);

  function updateField(field) {
    return (event) => {
      const value = event.target.value;
      setForm((previous) => ({ ...previous, [field]: value }));
      setClientErrors((previous) => {
        if (!previous[field]) return previous;
        const { [field]: _removed, ...rest } = previous;
        return rest;
      });
      setFieldErrors((previous) => {
        if (!previous[field]) return previous;
        const { [field]: _removed, ...rest } = previous;
        return rest;
      });
    };
  }

  function validateClient() {
    const errors = {};
    const username = form.username.trim().toLowerCase();
    const displayName = form.displayName.trim();
    const email = form.email.trim();

    if (!username) {
      errors.username = 'Username is required.';
    } else if (!USERNAME_PATTERN.test(username)) {
      errors.username = '3–24 lowercase letters, numbers, or underscores.';
    }

    if (!displayName) {
      errors.displayName = 'Display name is required.';
    } else if (displayName.length > 48) {
      errors.displayName = 'Display name must be at most 48 characters.';
    }

    if (!email) {
      errors.email = 'Email is required.';
    } else if (!EMAIL_PATTERN.test(email)) {
      errors.email = 'Enter a valid email address.';
    }

    if (!form.password) {
      errors.password = 'Password is required.';
    } else if (passwordScore < 2) {
      errors.password = 'Password must be at least 8 characters with a letter and a number.';
    }

    if (!form.passwordConfirm) {
      errors.passwordConfirm = 'Please confirm your password.';
    } else if (form.password !== form.passwordConfirm) {
      errors.passwordConfirm = 'Passwords do not match.';
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
      const user = await register({
        username: form.username.trim().toLowerCase(),
        displayName: form.displayName.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      showSuccessToast(`Welcome to CodeNest, ${user?.displayName ?? user?.username ?? ''}!`.trim());
      navigate('/', { replace: true });
    } catch (error) {
      const normalized = extractApiError(
        error,
        'Could not create your account. Please try again.',
      );
      setServerMessage(normalized.message);
      setFieldErrors(normalized.fieldErrors);
    } finally {
      setSubmitting(false);
    }
  }

  const usernameError = fieldErrors.username ?? clientErrors.username;
  const displayNameError = fieldErrors.displayName ?? clientErrors.displayName;
  const emailError = fieldErrors.email ?? clientErrors.email;
  const passwordError = fieldErrors.password ?? clientErrors.password;
  const passwordConfirmError = fieldErrors.passwordConfirm ?? clientErrors.passwordConfirm;

  return (
    <AuthCard
      title="Create your account"
      subtitle="Join CodeNest and start sharing snippets."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-accent hover:underline">
            Login
          </Link>
        </>
      }
    >
      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-4"
        aria-describedby={serverMessage ? 'register-server-error' : undefined}
      >
        {serverMessage ? (
          <div id="register-server-error">
            <FormError message={serverMessage} />
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="Username"
            name="username"
            autoComplete="username"
            required
            placeholder="yourhandle"
            hint="Lowercase letters, numbers, underscores."
            value={form.username}
            onChange={updateField('username')}
            error={usernameError}
          />
          <FormField
            label="Display name"
            name="displayName"
            autoComplete="name"
            required
            placeholder="Your name"
            value={form.displayName}
            onChange={updateField('displayName')}
            error={displayNameError}
          />
        </div>

        <FormField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          required
          placeholder="you@example.com"
          value={form.email}
          onChange={updateField('email')}
          error={emailError}
        />

        <div>
          <PasswordField
            label="Password"
            name="new-password"
            autoComplete="new-password"
            required
            placeholder="Choose a strong password"
            value={form.password}
            onChange={updateField('password')}
            error={passwordError}
          />
          <PasswordStrengthMeter password={form.password} />
        </div>

        <PasswordField
          label="Confirm password"
          name="password-confirm"
          autoComplete="new-password"
          required
          placeholder="Re-enter your password"
          value={form.passwordConfirm}
          onChange={updateField('passwordConfirm')}
          error={passwordConfirmError}
        />

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? (
            <>
              <Spinner size="sm" label="Creating account" />
              <span>Creating account…</span>
            </>
          ) : (
            <span>Create account</span>
          )}
        </button>
      </form>
    </AuthCard>
  );
}

export default RegisterPage;
