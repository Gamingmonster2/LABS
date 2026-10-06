'use strict';

/**
 * git-changes.js
 * Isolates ONLY the entry files that were newly added in the current change set.
 * This keeps CI fast: we never re-validate the whole catalog.
 */

const { execFileSync } = require('node:child_process');

function git(args, options = {}) {
  return execFileSync('git', args, { encoding: 'utf8', ...options }).trim();
}

/**
 * Determine the ref to diff against.
 * Order of precedence:
 *   1. BASE_REF env (explicit override)
 *   2. origin/<GITHUB_BASE_REF> in GitHub Actions
 *   3. HEAD~1 fallback for local runs
 */
function resolveBaseRef() {
  if (process.env.BASE_REF) {
    return process.env.BASE_REF;
  }
  if (process.env.GITHUB_BASE_REF) {
    return `origin/${process.env.GITHUB_BASE_REF}`;
  }
  return 'HEAD~1';
}

/**
 * Return absolute-free relative paths of files added under `dir`.
 * Uses --diff-filter=A so modified/deleted files are ignored.
 */
function getAddedFiles(dir) {
  const base = resolveBaseRef();

  const attempts = [
    ['diff', '--name-only', '--diff-filter=A', `${base}...HEAD`, '--', dir],
    ['diff', '--name-only', '--diff-filter=A', 'HEAD~1', '--', dir],
    ['diff', '--name-only', '--diff-filter=A', '--cached', '--', dir]
  ];

  for (const args of attempts) {
    try {
      const output = git(args);
      return output
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
    } catch {
      // Try the next strategy.
    }
  }

  // Not a git repository yet, or no diffable history: nothing to validate.
  return [];
}

module.exports = { getAddedFiles, resolveBaseRef, git };
