import { useState } from 'react';
import clsx from 'clsx';

const STDIN_MAX_LENGTH = 8 * 1024;

const OUTPUT_TABS = [
  { id: 'stdout', label: 'stdout' },
  { id: 'stderr', label: 'stderr' },
  { id: 'stdin', label: 'stdin' },
];

function formatRuntime(language, version) {
  if (!language) return 'Runtime pending';
  return `${language}${version ? `@${version}` : ''}`;
}

function formatExitCode(code) {
  return code === null || code === undefined ? 'Exit code: -' : `Exit code: ${code}`;
}

function OutputBlock({ value, variant }) {
  if (!value) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-center text-sm text-slate-500">
        No output yet - click Run to execute.
      </div>
    );
  }

  return (
    <pre
      className={clsx(
        'h-full overflow-auto whitespace-pre-wrap wrap-break-word p-4 font-mono text-sm leading-6',
        variant === 'stderr' ? 'text-red-300' : 'text-emerald-300',
      )}
    >
      {value}
    </pre>
  );
}

export function OutputPanel({
  output,
  runtimeLanguage,
  runtimeVersion,
  onClear,
  onStdinChange,
}) {
  const [activeTab, setActiveTab] = useState('stdout');
  const exitCodeIsSuccess = output.code === 0;
  const stdinRemaining = STDIN_MAX_LENGTH - output.stdin.length;

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-2xl border border-fg/10 bg-slate-950 text-slate-100 md:rounded-none md:border-0 md:border-t md:border-fg/10">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Output</h2>
          <label className="mt-1 flex items-center gap-2 text-xs text-slate-400">
            <span>Runtime</span>
            <select
              value={formatRuntime(runtimeLanguage, runtimeVersion)}
              disabled
              aria-label="Runtime"
              className="max-w-40 truncate rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-300"
            >
              <option>{formatRuntime(runtimeLanguage, runtimeVersion)}</option>
            </select>
          </label>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={clsx(
              'rounded-full border px-2 py-1 text-xs font-semibold',
              exitCodeIsSuccess
                ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
                : 'border-red-400/30 bg-red-400/10 text-red-200',
            )}
          >
            {formatExitCode(output.code)}
          </span>
          <button
            type="button"
            onClick={onClear}
            className="rounded-md border border-white/10 px-2 py-1 text-xs font-medium text-slate-200 transition-colors hover:bg-white/10"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 border-b border-white/10 bg-white/3 p-1">
        {OUTPUT_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
              activeTab === tab.id ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white',
            )}
            aria-pressed={activeTab === tab.id}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1">
        {activeTab === 'stdout' ? <OutputBlock value={output.stdout} variant="stdout" /> : null}
        {activeTab === 'stderr' ? <OutputBlock value={output.stderr} variant="stderr" /> : null}
        {activeTab === 'stdin' ? (
          <div className="flex h-full flex-col gap-2 p-4">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="run-stdin">
              Standard input
            </label>
            <textarea
              id="run-stdin"
              value={output.stdin}
              maxLength={STDIN_MAX_LENGTH}
              onChange={(event) => onStdinChange?.(event.target.value)}
              placeholder="Input for the next run..."
              className="min-h-0 flex-1 resize-none rounded-lg border border-white/10 bg-black/30 p-3 font-mono text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
            <p className="text-right text-xs text-slate-500">{stdinRemaining} characters remaining</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default OutputPanel;
