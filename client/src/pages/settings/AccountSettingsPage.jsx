import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import authService from '../../api/authService.js';
import PasswordField from '../../components/auth/PasswordField.jsx';
import ConfirmModal from '../../components/common/ConfirmModal.jsx';
import FormError from '../../components/common/FormError.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import extractApiError from '../../utils/apiError.js';
import { formatAbsoluteDate } from '../../utils/formatDate.js';
import { showSuccessToast } from '../../utils/helpers.js';

const INITIAL_PASSWORD_FORM = {
  currentPassword: '',
  newPassword: '',
  newPasswordConfirm: '',
};

function SettingsCard({ title, description, children, tone = 'default' }) {
  const borderClass = tone === 'danger' ? 'border-danger/50' : 'border-fg/10';

  return (
    <section className={`rounded-2xl border ${borderClass} bg-bg/70 p-5 shadow-sm`}>
      <h2 className="text-lg font-semibold text-fg">{title}</h2>
      {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function HelpTooltip({ text }) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label={text}
        className="grid h-5 w-5 place-items-center rounded-full border border-fg/10 text-xs font-semibold text-muted transition-colors hover:border-accent/40 hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
      >
        ?
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-56 -translate-x-1/2 rounded-md border border-fg/10 bg-bg px-3 py-2 text-xs font-normal leading-5 text-muted shadow-lg group-hover:block group-focus-within:block"
      >
        {text}
      </span>
    </span>
  );
}

export function AccountSettingsPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [passwordForm, setPasswordForm] = useState(INITIAL_PASSWORD_FORM);
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteForm, setDeleteForm] = useState({ password: '', confirmText: '' });
  const [deleteMessage, setDeleteMessage] = useState('');
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  function updatePasswordField(field) {
    return (event) => {
      setPasswordForm((previous) => ({ ...previous, [field]: event.target.value }));
      setPasswordErrors((previous) => {
        if (!previous[field]) return previous;
        const { [field]: _removed, ...rest } = previous;
        return rest;
      });
      if (passwordMessage) setPasswordMessage('');
    };
  }

  function updateDeleteField(field) {
    return (event) => {
      setDeleteForm((previous) => ({ ...previous, [field]: event.target.value }));
      if (deleteMessage) setDeleteMessage('');
    };
  }

  function validatePasswordForm() {
    const errors = {};

    if (!passwordForm.currentPassword) errors.currentPassword = 'Current password is required.';
    if (!passwordForm.newPassword) {
      errors.newPassword = 'New password is required.';
    } else if (passwordForm.newPassword.length < 8) {
      errors.newPassword = 'New password must be at least 8 characters.';
    }
    if (!passwordForm.newPasswordConfirm) {
      errors.newPasswordConfirm = 'Please confirm your new password.';
    } else if (passwordForm.newPassword !== passwordForm.newPasswordConfirm) {
      errors.newPasswordConfirm = 'Passwords do not match.';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    if (passwordSubmitting || !validatePasswordForm()) return;

    setPasswordSubmitting(true);
    setPasswordMessage('');

    try {
      await authService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm(INITIAL_PASSWORD_FORM);
      showSuccessToast('Password changed successfully.');
    } catch (apiError) {
      const normalized = extractApiError(apiError, 'Could not change your password.');
      setPasswordMessage(normalized.message);
      setPasswordErrors(normalized.fieldErrors);
    } finally {
      setPasswordSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    if (deleteSubmitting) return;
    if (!deleteForm.password) {
      setDeleteMessage('Password is required.');
      return;
    }
    if (deleteForm.confirmText !== 'DELETE') {
      setDeleteMessage('Type DELETE to confirm account deletion.');
      return;
    }

    setDeleteSubmitting(true);
    setDeleteMessage('');

    try {
      await authService.deleteAccount({ password: deleteForm.password });
      auth.logout({ redirect: false });
      navigate('/', { replace: true });
      showSuccessToast('Your account has been deleted.');
    } catch (apiError) {
      const normalized = extractApiError(apiError, 'Could not delete your account.');
      setDeleteMessage(normalized.message);
    } finally {
      setDeleteSubmitting(false);
    }
  }

  function closeDeleteModal() {
    if (deleteSubmitting) return;
    setDeleteModalOpen(false);
    setDeleteForm({ password: '', confirmText: '' });
    setDeleteMessage('');
  }

  const user = auth.user ?? {};
  const canDelete = deleteForm.password.length > 0 && deleteForm.confirmText === 'DELETE';

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-fg">Account</h1>
        <p className="mt-1 text-sm text-muted">
          Review your identity, update your password, or permanently delete your account.
        </p>
      </header>

      <SettingsCard title="Identity" description="These details identify your CodeNest account.">
        <dl className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-fg/10 bg-fg/2 p-4">
            <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted">
              Username
              <HelpTooltip text="Your username is the canonical handle for profile URLs and cannot be changed." />
            </dt>
            <dd className="mt-2 wrap-break-word text-sm font-semibold text-fg">{user.username}</dd>
          </div>
          <div className="rounded-xl border border-fg/10 bg-fg/2 p-4">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted">Email</dt>
            <dd className="mt-2 wrap-break-word text-sm font-semibold text-fg">{user.email}</dd>
          </div>
          <div className="rounded-xl border border-fg/10 bg-fg/2 p-4">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted">Created</dt>
            <dd className="mt-2 text-sm font-semibold text-fg">
              {formatAbsoluteDate(user.createdAt) || 'Unknown'}
            </dd>
          </div>
        </dl>
      </SettingsCard>

      <SettingsCard
        title="Change password"
        description="Use a strong password you do not reuse on other services."
      >
        <form onSubmit={handlePasswordSubmit} noValidate className="grid gap-4">
          {passwordMessage ? <FormError message={passwordMessage} /> : null}

          <PasswordField
            label="Current password"
            name="currentPassword"
            autoComplete="current-password"
            required
            value={passwordForm.currentPassword}
            onChange={updatePasswordField('currentPassword')}
            error={passwordErrors.currentPassword}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <PasswordField
              label="New password"
              name="newPassword"
              autoComplete="new-password"
              required
              hint="At least 8 characters."
              value={passwordForm.newPassword}
              onChange={updatePasswordField('newPassword')}
              error={passwordErrors.newPassword}
            />
            <PasswordField
              label="Confirm new password"
              name="newPasswordConfirm"
              autoComplete="new-password"
              required
              value={passwordForm.newPasswordConfirm}
              onChange={updatePasswordField('newPasswordConfirm')}
              error={passwordErrors.newPasswordConfirm}
            />
          </div>

          <button
            type="submit"
            disabled={passwordSubmitting}
            className="inline-flex w-fit items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {passwordSubmitting ? <Spinner size="sm" label="Changing password" /> : null}
            Change password
          </button>
        </form>
      </SettingsCard>

      <SettingsCard
        title="Danger zone"
        description="Deleting your account permanently removes your profile and related data."
        tone="danger"
      >
        <button
          type="button"
          onClick={() => setDeleteModalOpen(true)}
          className="rounded-md bg-danger px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-danger/90 focus:outline-none focus:ring-2 focus:ring-danger/30"
        >
          Delete my account
        </button>
      </SettingsCard>

      <ConfirmModal
        open={deleteModalOpen}
        onClose={closeDeleteModal}
        title="Delete your account?"
        description="This action is permanent. Confirm your password and type DELETE to continue."
        confirmLabel="Delete account"
        cancelLabel="Keep account"
        tone="danger"
        loading={deleteSubmitting}
        onConfirm={handleDeleteConfirm}
      >
        <div className="grid gap-4">
          {deleteMessage ? <FormError message={deleteMessage} /> : null}
          <PasswordField
            label="Password"
            name="deletePassword"
            autoComplete="current-password"
            required
            value={deleteForm.password}
            onChange={updateDeleteField('password')}
          />
          <label className="flex flex-col gap-1.5 text-sm font-medium text-fg">
            Type DELETE to confirm
            <input
              type="text"
              value={deleteForm.confirmText}
              onChange={updateDeleteField('confirmText')}
              autoComplete="off"
              className="w-full rounded-md border border-fg/10 bg-bg/60 px-3 py-2 text-sm text-fg placeholder:text-muted transition-colors focus:border-danger focus:outline-none focus:ring-2 focus:ring-danger/30"
            />
          </label>
          <p className="text-xs text-muted" aria-live="polite">
            {canDelete ? 'Ready to delete.' : 'Both password and DELETE confirmation are required.'}
          </p>
        </div>
      </ConfirmModal>
    </div>
  );
}

export default AccountSettingsPage;
