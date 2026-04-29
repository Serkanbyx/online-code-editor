import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import toast from 'react-hot-toast';

import codeService from '../../api/codeService.js';
import snippetService from '../../api/snippetService.js';
import ConfirmModal from '../../components/common/ConfirmModal.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import Skeleton from '../../components/common/Skeleton.jsx';
import LanguageSelect from '../../components/editor/LanguageSelect.jsx';
import MonacoPane from '../../components/editor/MonacoPane.jsx';
import OutputPanel from '../../components/editor/OutputPanel.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { usePreferences } from '../../context/PreferencesContext.jsx';
import { extractApiError } from '../../utils/apiError.js';

const RUN_THROTTLE_MS = 2000;
const STDIN_MAX_LENGTH = 8 * 1024;

const DEFAULT_OUTPUT_STATE = {
  stdout: '',
  stderr: '',
  code: null,
  signal: null,
  version: null,
  stdin: '',
};

function getSnippetId(snippet) {
  return snippet?._id ?? snippet?.id;
}

function getAuthorId(snippet) {
  return snippet?.author?._id ?? snippet?.author;
}

function isSnippetAuthor(snippet, user) {
  const authorId = getAuthorId(snippet);
  return Boolean(authorId && user?._id && String(authorId) === String(user._id));
}

function compareRuntimeVersions(leftVersion = '', rightVersion = '') {
  const leftParts = leftVersion.split(/[.+-]/).map((part) => Number.parseInt(part, 10) || 0);
  const rightParts = rightVersion.split(/[.+-]/).map((part) => Number.parseInt(part, 10) || 0);
  const maxLength = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const difference = leftParts[index] - rightParts[index];
    if (difference !== 0) return difference;
  }

  return 0;
}

function getLatestRuntime(runtimes, language) {
  if (!language) return null;

  return runtimes
    .filter((runtime) => runtime.language === language)
    .sort((left, right) => compareRuntimeVersions(right.version, left.version))[0] ?? null;
}

function EditSnippetSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-fg/10 bg-bg/70">
      <div className="flex flex-col gap-3 border-b border-fg/10 p-4 lg:flex-row lg:items-center lg:justify-between">
        <Skeleton className="h-9 w-64 max-w-full" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
      <Skeleton className="h-[70vh] w-full rounded-none" />
    </div>
  );
}

export function EditSnippetPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { prefs, updatePref } = usePreferences();
  const runtimeCatalogRef = useRef(null);
  const lastRunClickRef = useRef(0);
  const permissionToastShownRef = useRef(false);

  const [snippet, setSnippet] = useState(null);
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState('');
  const [outputState, setOutputState] = useState(DEFAULT_OUTPUT_STATE);
  const [runtimeCatalog, setRuntimeCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [retryToken, setRetryToken] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const snippetId = getSnippetId(snippet) ?? id;
  const currentRuntime = useMemo(
    () => getLatestRuntime(runtimeCatalog, language),
    [language, runtimeCatalog],
  );
  const displayedRuntimeVersion = outputState.version ?? currentRuntime?.version ?? null;
  const trimmedTitle = title.trim();
  const canSave = Boolean(trimmedTitle) && !saving && !deleting;

  useEffect(() => {
    if (runtimeCatalogRef.current) return undefined;

    let cancelled = false;

    codeService
      .runtimes()
      .then((data) => {
        if (cancelled) return;
        const runtimes = Array.isArray(data?.runtimes) ? data.runtimes : [];
        runtimeCatalogRef.current = runtimes;
        setRuntimeCatalog(runtimes);
      })
      .catch(() => {
        if (!cancelled) {
          runtimeCatalogRef.current = [];
          setRuntimeCatalog([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!id) return undefined;

    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    snippetService
      .getById(id)
      .then((data) => {
        if (cancelled) return;

        const nextSnippet = data?.snippet ?? null;
        if (!isSnippetAuthor(nextSnippet, user)) {
          if (!permissionToastShownRef.current) {
            permissionToastShownRef.current = true;
            toast.error("You don't have permission to edit this snippet");
          }
          navigate(`/snippets/${getSnippetId(nextSnippet) ?? id}`, { replace: true });
          return;
        }

        setSnippet(nextSnippet);
        setTitle(nextSnippet?.title ?? '');
        setLanguage(nextSnippet?.language ?? 'javascript');
        setCode(nextSnippet?.code ?? '');
      })
      .catch((apiError) => {
        if (cancelled) return;
        const normalized = extractApiError(apiError, 'Could not load this snippet.');
        setLoadError(normalized);
        setSnippet(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, navigate, retryToken, user]);

  const handleThemeToggle = useCallback(() => {
    const nextTheme = prefs.editorTheme === 'vs-dark' ? 'vs' : 'vs-dark';
    void updatePref('editorTheme', nextTheme);
  }, [prefs.editorTheme, updatePref]);

  const handleStdinChange = useCallback((nextStdin) => {
    setOutputState((currentOutput) => ({
      ...currentOutput,
      stdin: nextStdin.slice(0, STDIN_MAX_LENGTH),
    }));
  }, []);

  const handleClearOutput = useCallback(() => {
    setOutputState((currentOutput) => ({
      ...DEFAULT_OUTPUT_STATE,
      stdin: currentOutput.stdin,
    }));
  }, []);

  const handleRun = useCallback(async () => {
    const now = Date.now();

    if (isRunning || now - lastRunClickRef.current < RUN_THROTTLE_MS) return;

    lastRunClickRef.current = now;
    setIsRunning(true);

    try {
      const result = await codeService.run({
        language,
        code,
        stdin: outputState.stdin,
      });

      setOutputState((currentOutput) => ({
        ...currentOutput,
        stdout: result?.stdout ?? '',
        stderr: result?.stderr ?? '',
        code: result?.code ?? null,
        signal: result?.signal ?? null,
        version: result?.version ?? currentRuntime?.version ?? null,
      }));
    } catch (apiError) {
      const normalized = extractApiError(apiError, 'Could not run this code.');

      setOutputState((currentOutput) => ({
        ...currentOutput,
        stdout: '',
        stderr: normalized.message,
        code: null,
        signal: null,
        version: currentRuntime?.version ?? currentOutput.version,
      }));
      toast.error('Run failed');
    } finally {
      setIsRunning(false);
    }
  }, [code, currentRuntime?.version, isRunning, language, outputState.stdin]);

  const handleSave = useCallback(async () => {
    if (!snippetId || !canSave) return;

    setSaving(true);
    try {
      const data = await snippetService.update(snippetId, {
        title: trimmedTitle,
        language,
        code,
      });

      const nextSnippet = data?.snippet ?? null;
      if (nextSnippet) {
        setSnippet(nextSnippet);
        setTitle(nextSnippet.title ?? trimmedTitle);
        setLanguage(nextSnippet.language ?? language);
        setCode(nextSnippet.code ?? code);
      }
      toast.success('Snippet saved');
    } catch (apiError) {
      const normalized = extractApiError(apiError, 'Could not save this snippet.');
      toast.error(normalized.message);
    } finally {
      setSaving(false);
    }
  }, [canSave, code, language, snippetId, trimmedTitle]);

  const handleDelete = useCallback(async () => {
    if (!snippetId || deleting) return;

    setDeleting(true);
    try {
      await snippetService.remove(snippetId);
      toast.success('Snippet deleted');
      navigate('/me/snippets', { replace: true });
    } catch (apiError) {
      const normalized = extractApiError(apiError, 'Could not delete this snippet.');
      toast.error(normalized.message);
    } finally {
      setDeleting(false);
      setDeleteModalOpen(false);
    }
  }, [deleting, navigate, snippetId]);

  if (loading) {
    return <EditSnippetSkeleton />;
  }

  if (loadError || !snippet) {
    return (
      <EmptyState
        title="Couldn't load this snippet"
        description={loadError?.message ?? 'Please try again in a moment.'}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => setRetryToken((token) => token + 1)}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
            >
              Try again
            </button>
            <Link
              to="/me/snippets"
              className="rounded-md border border-fg/10 px-4 py-2 text-sm font-medium text-fg transition-colors hover:bg-fg/5"
            >
              Back to snippets
            </Link>
          </div>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-2xl border border-fg/10 bg-bg/70 shadow-sm">
        <header className="flex flex-col gap-3 border-b border-fg/10 bg-bg/95 px-4 py-3 backdrop-blur lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <label className="sr-only" htmlFor="snippet-title">
              Snippet title
            </label>
            <input
              id="snippet-title"
              value={title}
              maxLength={120}
              onChange={(event) => setTitle(event.target.value.slice(0, 120))}
              className={clsx(
                'w-full truncate rounded-md border bg-transparent px-2 py-1.5 text-lg font-semibold tracking-tight text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30',
                trimmedTitle ? 'border-fg/10' : 'border-danger',
              )}
              aria-invalid={!trimmedTitle}
              aria-describedby={!trimmedTitle ? 'snippet-title-error' : undefined}
            />
            {!trimmedTitle ? (
              <p id="snippet-title-error" className="mt-1 text-xs text-danger">
                Title is required.
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <LanguageSelect value={language} onChange={setLanguage} />
            <button
              type="button"
              onClick={handleThemeToggle}
              className="h-9 rounded-md border border-fg/10 px-3 text-sm font-medium text-fg transition-colors hover:border-fg/20 hover:bg-fg/5"
            >
              Theme
            </button>
            <Link
              to={`/snippets/${snippetId}`}
              className="inline-flex h-9 items-center rounded-md border border-fg/10 px-3 text-sm font-medium text-fg transition-colors hover:border-fg/20 hover:bg-fg/5"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="h-9 rounded-md border border-fg/10 px-3 text-sm font-medium text-fg transition-colors hover:border-fg/20 hover:bg-fg/5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => setDeleteModalOpen(true)}
              disabled={deleting}
              className="h-9 rounded-md border border-danger/20 px-3 text-sm font-medium text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={handleRun}
              disabled={isRunning}
              className="h-9 rounded-md bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-70"
              aria-live="polite"
            >
              {isRunning ? 'Running...' : 'Run'}
            </button>
          </div>
        </header>

        <div className="h-[72vh] min-h-[560px] p-3 md:grid md:min-h-[620px] md:grid-rows-[minmax(0,1fr)_200px] md:p-0">
          <main className="min-h-0 min-w-0">
            <MonacoPane
              language={language}
              value={code}
              onChange={setCode}
            />
          </main>
          <div className="mt-3 min-h-0 md:mt-0">
            <OutputPanel
              output={outputState}
              runtimeLanguage={language}
              runtimeVersion={displayedRuntimeVersion}
              onClear={handleClearOutput}
              onStdinChange={handleStdinChange}
            />
          </div>
        </div>
      </div>

      <p className="px-1 text-xs text-muted">
        Solo edit mode. This page does not connect to rooms, Yjs, or Socket.io.
      </p>

      <ConfirmModal
        open={deleteModalOpen}
        onClose={() => {
          if (!deleting) setDeleteModalOpen(false);
        }}
        title="Delete snippet?"
        description={`This permanently deletes "${snippet.title}" and removes its comments and likes. This cannot be undone.`}
        confirmLabel="Delete snippet"
        tone="danger"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}

export default EditSnippetPage;
