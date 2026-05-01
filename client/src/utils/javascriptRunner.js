const RUN_TIMEOUT_MS = 4000;

export function runJavaScriptInBrowser({ code, stdin = '' }) {
  return new Promise((resolve) => {
    const blob = new Blob([
      `
        self.onmessage = async (event) => {
          const { code, stdin } = event.data;
          const stdout = [];
          const stderr = [];

          const serialize = (value) => {
            if (typeof value === 'string') return value;
            try {
              return JSON.stringify(value);
            } catch {
              return String(value);
            }
          };

          const sandboxConsole = {
            log: (...args) => stdout.push(args.map(serialize).join(' ')),
            info: (...args) => stdout.push(args.map(serialize).join(' ')),
            warn: (...args) => stderr.push(args.map(serialize).join(' ')),
            error: (...args) => stderr.push(args.map(serialize).join(' ')),
          };

          const disabledNetwork = () => {
            throw new Error('Network access is disabled in the browser runner.');
          };

          try {
            const execute = new Function(
              'console',
              'stdin',
              'fetch',
              'XMLHttpRequest',
              'WebSocket',
              'EventSource',
              'importScripts',
              '"use strict";\\n' + code,
            );

            await execute(
              sandboxConsole,
              stdin || '',
              disabledNetwork,
              undefined,
              undefined,
              undefined,
              disabledNetwork,
            );

            self.postMessage({
              stdout: stdout.length ? stdout.join('\\n') + '\\n' : '',
              stderr: stderr.length ? stderr.join('\\n') + '\\n' : '',
              code: 0,
              signal: null,
            });
          } catch (error) {
            self.postMessage({
              stdout: stdout.length ? stdout.join('\\n') + '\\n' : '',
              stderr: error?.stack || error?.message || String(error),
              code: 1,
              signal: null,
            });
          }
        };
      `,
    ], { type: 'text/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);
    const timeout = window.setTimeout(() => {
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      resolve({
        stdout: '',
        stderr: 'Execution timed out after 4 seconds.',
        code: null,
        signal: 'TIMEOUT',
        language: 'javascript',
        version: 'browser',
      });
    }, RUN_TIMEOUT_MS);

    worker.onmessage = (event) => {
      window.clearTimeout(timeout);
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      resolve({
        ...event.data,
        language: 'javascript',
        version: 'browser',
      });
    };

    worker.onerror = (error) => {
      window.clearTimeout(timeout);
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      resolve({
        stdout: '',
        stderr: error?.message || 'JavaScript runner failed.',
        code: 1,
        signal: null,
        language: 'javascript',
        version: 'browser',
      });
    };

    worker.postMessage({ code, stdin });
  });
}
