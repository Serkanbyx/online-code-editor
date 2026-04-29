import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

import authService from '../../api/authService.js';
import uploadService from '../../api/uploadService.js';
import Avatar from '../../components/common/Avatar.jsx';
import CharacterCounter from '../../components/common/CharacterCounter.jsx';
import FormError from '../../components/common/FormError.jsx';
import FormField from '../../components/common/FormField.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import extractApiError from '../../utils/apiError.js';

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const BIO_MAX_LENGTH = 240;
const DISPLAY_NAME_MAX_LENGTH = 48;

function SettingsCard({ title, description, children, action }) {
  return (
    <section className="rounded-2xl border border-fg/10 bg-bg/70 p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-fg">{title}</h2>
          {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SaveIndicator({ status, onRetry }) {
  if (status === 'idle') return null;

  if (status === 'saving') {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-muted" aria-live="polite">
        <Spinner size="sm" label="Saving profile" />
        Saving...
      </span>
    );
  }

  if (status === 'error') {
    return (
      <button
        type="button"
        onClick={onRetry}
        className="text-sm font-medium text-danger transition-colors hover:text-danger/80"
      >
        Save failed - retry
      </button>
    );
  }

  return (
    <span className="text-sm font-medium text-success" aria-live="polite">
      Saved
    </span>
  );
}

function AvatarUploader({ user, onUploaded }) {
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function validateFile(file) {
    if (!file) return 'Choose an image file.';
    if (!file.type.startsWith('image/')) return 'Avatar must be an image file.';
    if (file.size > AVATAR_MAX_BYTES) return 'Avatar must be 2MB or smaller.';
    return '';
  }

  async function uploadFile(file) {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return nextPreviewUrl;
    });
    setError('');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const data = await uploadService.avatar(formData);
      onUploaded(data.avatarUrl);
    } catch (apiError) {
      const normalized = extractApiError(apiError, 'Could not upload your avatar.');
      setError(normalized.message);
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(event) {
    const [file] = event.target.files ?? [];
    uploadFile(file);
    event.target.value = '';
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragActive(false);
    const [file] = event.dataTransfer.files ?? [];
    uploadFile(file);
  }

  const previewUser = previewUrl ? { ...user, avatarUrl: previewUrl } : user;

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragActive(false);
        }}
        onDrop={handleDrop}
        disabled={uploading}
        className={clsx(
          'flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-6 text-center transition-colors',
          dragActive ? 'border-accent bg-accent/5' : 'border-fg/20 bg-fg/2',
          'hover:border-accent/70 hover:bg-accent/5 focus:outline-none focus:ring-2 focus:ring-accent/30',
          uploading && 'cursor-wait opacity-80',
        )}
      >
        <Avatar user={previewUser} size="lg" className="h-20 w-20 text-2xl" />
        <span className="text-sm font-medium text-fg">
          {uploading ? 'Uploading avatar...' : 'Drag an image here or click to upload'}
        </span>
        <span className="text-xs text-muted">PNG, JPG, GIF or WebP. Maximum 2MB.</span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFileChange}
      />

      {error ? <FormError message={error} /> : null}
    </div>
  );
}

export function ProfileSettingsPage() {
  const auth = useAuth();
  const [form, setForm] = useState({
    displayName: auth.user?.displayName ?? '',
    bio: auth.user?.bio ?? '',
  });
  const [persistedForm, setPersistedForm] = useState(form);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [lastFailedPayload, setLastFailedPayload] = useState(null);

  useEffect(() => {
    const nextForm = {
      displayName: auth.user?.displayName ?? '',
      bio: auth.user?.bio ?? '',
    };
    setForm(nextForm);
    setPersistedForm(nextForm);
  }, [auth.user?.displayName, auth.user?.bio]);

  const saveProfile = useCallback(
    async (payload) => {
      if (!payload || Object.keys(payload).length === 0) return;

      setStatus('saving');
      setMessage('');

      try {
        const data = await authService.updateProfile(payload);
        const nextUser = data.user ?? payload;
        auth.updateUser(nextUser);
        setPersistedForm((previous) => ({ ...previous, ...payload }));
        setLastFailedPayload(null);
        setStatus('saved');
      } catch (apiError) {
        const normalized = extractApiError(apiError, 'Could not save your profile.');
        setMessage(normalized.message);
        setLastFailedPayload(payload);
        setStatus('error');
      }
    },
    [auth],
  );

  function updateField(field) {
    return (event) => {
      const value = event.target.value;
      setForm((previous) => ({ ...previous, [field]: value }));
      if (message) setMessage('');
    };
  }

  function handleBlur(field) {
    return () => {
      const value = form[field].trim();

      if (field === 'displayName' && value.length < 1) return;
      if (field === 'displayName' && value.length > DISPLAY_NAME_MAX_LENGTH) return;
      if (field === 'bio' && value.length > BIO_MAX_LENGTH) return;
      if (value === persistedForm[field]) return;

      setForm((previous) => ({ ...previous, [field]: value }));
      saveProfile({ [field]: value });
    };
  }

  function handleAvatarUploaded(avatarUrl) {
    if (!avatarUrl) return;
    auth.updateUser({ avatarUrl });
    setStatus('saved');
  }

  const displayNameWarning =
    form.displayName.trim().length === 0 ? 'Display name must be at least 1 character.' : '';
  const bioOverLimit = form.bio.length > BIO_MAX_LENGTH;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-fg">Profile</h1>
          <p className="mt-1 text-sm text-muted">
            Update the public details people see around CodeNest.
          </p>
        </div>
        <SaveIndicator status={status} onRetry={() => saveProfile(lastFailedPayload)} />
      </header>

      {message ? <FormError message={message} /> : null}

      <SettingsCard
        title="Avatar"
        description="Upload a clear image that represents you across snippets and rooms."
      >
        <AvatarUploader user={auth.user} onUploaded={handleAvatarUploaded} />
      </SettingsCard>

      <SettingsCard title="Public profile" description="Keep your name and short bio up to date.">
        <div className="grid gap-4">
          <FormField
            label="Display name"
            name="displayName"
            autoComplete="name"
            maxLength={DISPLAY_NAME_MAX_LENGTH}
            value={form.displayName}
            onChange={updateField('displayName')}
            onBlur={handleBlur('displayName')}
            error={displayNameWarning}
            hint="Autosaves when you leave the field."
          />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="profile-bio" className="text-sm font-medium text-fg">
              Bio
            </label>
            <textarea
              id="profile-bio"
              name="bio"
              rows={5}
              maxLength={BIO_MAX_LENGTH + 20}
              value={form.bio}
              onChange={updateField('bio')}
              onBlur={handleBlur('bio')}
              aria-describedby="profile-bio-counter"
              aria-invalid={bioOverLimit || undefined}
              className={clsx(
                'w-full resize-y rounded-md border bg-bg/60 px-3 py-2 text-sm text-fg placeholder:text-muted',
                'transition-colors focus:outline-none focus:ring-2',
                bioOverLimit
                  ? 'border-danger/60 focus:border-danger focus:ring-danger/30'
                  : 'border-fg/10 focus:border-accent focus:ring-accent/30',
              )}
              placeholder="Tell people what you build."
            />
            <div id="profile-bio-counter" className="flex items-center justify-between gap-3">
              <p className={clsx('text-xs', bioOverLimit ? 'text-danger' : 'text-muted')}>
                {bioOverLimit ? 'Bio must be at most 240 characters.' : 'Autosaves on blur.'}
              </p>
              <CharacterCounter current={form.bio.length} max={BIO_MAX_LENGTH} />
            </div>
          </div>
        </div>
      </SettingsCard>
    </div>
  );
}

export default ProfileSettingsPage;
