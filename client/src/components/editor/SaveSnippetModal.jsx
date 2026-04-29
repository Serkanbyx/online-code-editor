import { useEffect, useId, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';

import Spinner from '../common/Spinner.jsx';

const MAX_TAGS = 6;
const TAG_PATTERN = /^[a-z0-9-]+$/;
const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'input:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function normalizeTag(value) {
  return value.trim().toLowerCase().replace(/\s+/g, '-');
}

function buildInitialState(roomName) {
  return {
    title: (roomName || 'Untitled snippet').slice(0, 120),
    description: '',
    tags: [],
    tagDraft: '',
    isPublic: false,
  };
}

export function SaveSnippetModal({ open, roomName, saving = false, onClose, onSubmit }) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef(null);
  const titleInputRef = useRef(null);
  const [formState, setFormState] = useState(() => buildInitialState(roomName));
  const [errors, setErrors] = useState({});

  const remainingTags = MAX_TAGS - formState.tags.length;
  const canAddTag = formState.tagDraft.trim() && remainingTags > 0;
  const tagHelpText = useMemo(
    () => `${remainingTags} ${remainingTags === 1 ? 'tag' : 'tags'} remaining`,
    [remainingTags],
  );

  useEffect(() => {
    if (!open) return;

    setFormState((currentState) => ({
      ...buildInitialState(roomName),
      isPublic: currentState.isPublic,
    }));
    setErrors({});
  }, [open, roomName]);

  useEffect(() => {
    if (!open) return undefined;

    const previousActiveElement = document.activeElement;
    titleInputRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!saving) onClose?.();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusableElements = [...dialogRef.current.querySelectorAll(FOCUSABLE_SELECTOR)];
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      if (previousActiveElement instanceof HTMLElement) {
        previousActiveElement.focus();
      }
    };
  }, [onClose, open, saving]);

  function updateField(fieldName, value) {
    setFormState((currentState) => ({ ...currentState, [fieldName]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [fieldName]: '' }));
  }

  function addTag(rawTag) {
    const tag = normalizeTag(rawTag);

    if (!tag) return;
    if (!TAG_PATTERN.test(tag)) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        tags: 'Tags may only contain lowercase letters, numbers, and hyphens.',
      }));
      return;
    }
    if (formState.tags.includes(tag)) {
      updateField('tagDraft', '');
      return;
    }
    if (formState.tags.length >= MAX_TAGS) {
      setErrors((currentErrors) => ({ ...currentErrors, tags: 'You can add up to 6 tags.' }));
      return;
    }

    setFormState((currentState) => ({
      ...currentState,
      tags: [...currentState.tags, tag],
      tagDraft: '',
    }));
    setErrors((currentErrors) => ({ ...currentErrors, tags: '' }));
  }

  function removeTag(tagToRemove) {
    setFormState((currentState) => ({
      ...currentState,
      tags: currentState.tags.filter((tag) => tag !== tagToRemove),
    }));
  }

  function validateForm() {
    const nextErrors = {};
    const title = formState.title.trim();
    const description = formState.description.trim();

    if (!title || title.length > 120) {
      nextErrors.title = 'Title must be 1-120 characters.';
    }

    if (description.length > 500) {
      nextErrors.description = 'Description must be at most 500 characters.';
    }

    if (formState.tags.some((tag) => !TAG_PATTERN.test(tag))) {
      nextErrors.tags = 'Tags may only contain lowercase letters, numbers, and hyphens.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validateForm()) return;

    await onSubmit?.({
      title: formState.title.trim(),
      description: formState.description.trim(),
      tags: formState.tags,
      isPublic: formState.isPublic,
    });
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-fg/50 px-4 py-6 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose?.();
      }}
    >
      <form
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-2xl border border-fg/10 bg-bg p-5 shadow-xl"
      >
        <div>
          <h2 id={titleId} className="text-lg font-semibold text-fg">
            Save snippet
          </h2>
          <p id={descriptionId} className="mt-1 text-sm text-muted">
            Save the current room code to your snippets.
          </p>
        </div>

        <div className="mt-5 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-fg">Title</span>
            <input
              ref={titleInputRef}
              value={formState.title}
              onChange={(event) => updateField('title', event.target.value.slice(0, 120))}
              maxLength={120}
              required
              disabled={saving}
              className={clsx(
                'rounded-md border bg-bg px-3 py-2 text-sm text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-70',
                errors.title ? 'border-danger' : 'border-fg/10',
              )}
            />
            {errors.title ? <span className="text-xs text-danger">{errors.title}</span> : null}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-fg">Description</span>
            <textarea
              value={formState.description}
              onChange={(event) => updateField('description', event.target.value.slice(0, 500))}
              maxLength={500}
              rows={4}
              disabled={saving}
              className={clsx(
                'resize-none rounded-md border bg-bg px-3 py-2 text-sm text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-70',
                errors.description ? 'border-danger' : 'border-fg/10',
              )}
            />
            <span className="text-xs text-muted">{formState.description.length}/500</span>
            {errors.description ? <span className="text-xs text-danger">{errors.description}</span> : null}
          </label>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="snippet-tags" className="text-sm font-medium text-fg">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 rounded-md border border-fg/10 bg-bg p-2 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30">
              {formState.tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-1 text-xs font-medium text-accent">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    disabled={saving}
                    className="rounded-full text-accent/80 hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label={`Remove ${tag} tag`}
                  >
                    x
                  </button>
                </span>
              ))}
              <input
                id="snippet-tags"
                value={formState.tagDraft}
                onChange={(event) => updateField('tagDraft', event.target.value.toLowerCase())}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ',') {
                    event.preventDefault();
                    addTag(formState.tagDraft);
                  }
                }}
                onBlur={() => addTag(formState.tagDraft)}
                disabled={saving || formState.tags.length >= MAX_TAGS}
                placeholder={formState.tags.length === 0 ? 'react, hooks, api' : ''}
                className="min-w-32 flex-1 bg-transparent px-1 py-1 text-sm text-fg outline-none placeholder:text-muted disabled:cursor-not-allowed"
              />
            </div>
            <span className="text-xs text-muted">{canAddTag ? 'Press Enter to add.' : tagHelpText}</span>
            {errors.tags ? <span className="text-xs text-danger">{errors.tags}</span> : null}
          </div>

          <label className="flex items-center justify-between gap-4 rounded-xl border border-fg/10 bg-fg/5 px-3 py-2">
            <span>
              <span className="block text-sm font-medium text-fg">Public snippet</span>
              <span className="block text-xs text-muted">Public snippets are visible in Explore.</span>
            </span>
            <input
              type="checkbox"
              checked={formState.isPublic}
              onChange={(event) => updateField('isPublic', event.target.checked)}
              disabled={saving}
              className="h-5 w-5 accent-accent disabled:cursor-not-allowed"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md border border-fg/10 bg-bg px-4 py-2 text-sm font-medium text-fg transition-colors hover:bg-fg/5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? <Spinner size="sm" label="Saving" className="text-white" /> : null}
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

export default SaveSnippetModal;
