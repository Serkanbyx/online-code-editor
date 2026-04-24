import ApiError from '../utils/ApiError.js';
import { SUPPORTED_LANGUAGES } from '../utils/constants.js';
import * as pistonClient from '../utils/pistonClient.js';

const supportedLanguageSet = new Set(SUPPORTED_LANGUAGES);

function readRuntimeNames(runtime) {
  return [runtime.language, ...(runtime.aliases || [])].filter(Boolean);
}

function findSupportedLanguage(runtime) {
  return readRuntimeNames(runtime).find((name) => supportedLanguageSet.has(name));
}

function toSupportedRuntime(runtime) {
  const language = findSupportedLanguage(runtime);

  if (!language) {
    return null;
  }

  return {
    language,
    version: runtime.version,
    aliases: runtime.aliases || [],
    pistonLanguage: runtime.language,
  };
}

function compareVersions(leftVersion, rightVersion) {
  const leftParts = leftVersion.split(/[.+-]/).map((part) => Number.parseInt(part, 10) || 0);
  const rightParts = rightVersion.split(/[.+-]/).map((part) => Number.parseInt(part, 10) || 0);
  const maxLength = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const difference = (leftParts[index] || 0) - (rightParts[index] || 0);

    if (difference !== 0) {
      return difference;
    }
  }

  return 0;
}

async function getSupportedRuntimes() {
  const runtimes = await pistonClient.getRuntimes();
  return runtimes.map(toSupportedRuntime).filter(Boolean);
}

function resolveRuntime(runtimes, language, version) {
  const languageRuntimes = runtimes.filter((runtime) => runtime.language === language);

  if (languageRuntimes.length === 0) {
    throw new ApiError(503, 'Runtime is not available for this language.');
  }

  if (version) {
    const requestedRuntime = languageRuntimes.find((runtime) => runtime.version === version);

    if (!requestedRuntime) {
      throw new ApiError(400, 'Unsupported runtime version.');
    }

    return requestedRuntime;
  }

  return [...languageRuntimes].sort((left, right) => compareVersions(right.version, left.version))[0];
}

export async function getRuntimes(_req, res) {
  const runtimes = await getSupportedRuntimes();
  res.json({ runtimes });
}

export async function runCode(req, res) {
  const { language, version, code, stdin } = req.body;
  const runtimes = await getSupportedRuntimes();
  const runtime = resolveRuntime(runtimes, language, version);
  const result = await pistonClient.execute({
    language: runtime.pistonLanguage,
    version: runtime.version,
    code,
    stdin,
  });
  const run = result.run || {};

  res.json({
    stdout: run.stdout || '',
    stderr: run.stderr || '',
    code: run.code ?? null,
    signal: run.signal ?? null,
    output: run.output || '',
    language,
    version: runtime.version,
  });
}
