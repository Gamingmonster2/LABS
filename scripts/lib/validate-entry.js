'use strict';

/**
 * validate-entry.js
 * Core validation logic for a single labs.ly entry file.
 *
 * Checks performed (no third-party APIs):
 *   1. Label format + length
 *   2. Reserved-word blocklist
 *   3. File content is a JSON object with a "target" URL
 *   4. GitHub repository existence (when the target is a GitHub repo)
 *   5. Live HTTP reachability + parked-domain redirect heuristics
 */

const { deriveLabel, parseEntryFile } = require('./entry-file');

const USER_AGENT = 'labs-ly-validator/1.0 (+https://labs.ly)';

/**
 * Confirm a GitHub repository exists by calling the public REST API.
 * A GITHUB_TOKEN is optional and only raises the rate limit.
 */
async function checkGithubRepo(url, config) {
  if (url.hostname !== 'github.com') {
    return { ok: true, skipped: true };
  }

  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length < 2) {
    return { ok: true, skipped: true };
  }

  const owner = segments[0];
  const repo = segments[1].replace(/\.git$/, '');

  const headers = {
    'User-Agent': USER_AGENT,
    Accept: 'application/vnd.github+json'
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const res = await fetch(`${config.githubApiBase}/repos/${owner}/${repo}`, { headers });
    if (res.status === 404) {
      return { ok: false, error: `GitHub repository ${owner}/${repo} does not exist` };
    }
    if (!res.ok) {
      return { ok: false, error: `GitHub API returned HTTP ${res.status} for ${owner}/${repo}` };
    }
    const data = await res.json();
    if (data.archived) {
      return { ok: true, warning: `GitHub repository ${owner}/${repo} is archived` };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: `GitHub API check failed for ${owner}/${repo}: ${error.message}` };
  }
}

/**
 * Verify the target is live and does not redirect to a parked/for-sale domain.
 */
async function checkReachability(rawUrl, config) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.requestTimeoutMs);

  try {
    const options = {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT }
    };

    let res = await fetch(rawUrl, { ...options, method: 'HEAD' });
    // Some servers reject HEAD; retry with GET before failing.
    if ([403, 405, 501].includes(res.status)) {
      res = await fetch(rawUrl, { ...options, method: 'GET' });
    }

    const finalUrl = res.url || rawUrl;

    if (res.status >= 400) {
      return { ok: false, error: `target responded with HTTP ${res.status}` };
    }

    const lowerFinal = finalUrl.toLowerCase();
    const blockedPattern = (config.blockedUrlPatterns || [])
      .find((pattern) => lowerFinal.includes(pattern.toLowerCase()));

    if (blockedPattern) {
      return { ok: false, error: `target redirects to a blocked/parked domain (${blockedPattern})` };
    }

    return { ok: true, finalUrl, status: res.status };
  } catch (error) {
    return { ok: false, error: `target is unreachable (${error.message})` };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Validate one entry file. Always resolves to a plain result object.
 */
async function validateEntry(file, config, reservedWords) {
  const errors = [];
  const warnings = [];
  const label = deriveLabel(file);

  // --- 1. Label checks -----------------------------------------------------
  if (!label || label.length < config.minLabelLength || label.length > config.maxLabelLength) {
    errors.push(
      `label "${label}" must be between ${config.minLabelLength} and ${config.maxLabelLength} characters`
    );
  }

  if (!new RegExp(config.labelPattern).test(label)) {
    errors.push(`label "${label}" must be lowercase alphanumeric with optional inner hyphens`);
  }

  // --- 2. Reserved-word check ---------------------------------------------
  if (reservedWords.has(label)) {
    errors.push(`label "${label}" is reserved and cannot be registered`);
  }

  // --- 3. Content check ----------------------------------------------------
  const parsed = parseEntryFile(file);
  for (const parseError of parsed.errors) {
    errors.push(parseError);
  }

  const target = parsed.target;
  if (!target) {
    return { file, label, errors, warnings };
  }

  let url;
  try {
    url = new URL(target);
  } catch {
    errors.push(`target "${target}" is not a valid absolute URL`);
    return { file, label, target, errors, warnings };
  }

  if (!config.allowedSchemes.includes(url.protocol)) {
    errors.push(`target scheme "${url.protocol}" is not allowed (use https)`);
  }

  if ((config.blockedHosts || []).includes(url.hostname.toLowerCase())) {
    errors.push(`target host "${url.hostname}" is blocked`);
  }

  // --- 4 + 5. Network checks (only when static checks already pass) --------
  if (errors.length === 0) {
    const github = await checkGithubRepo(url, config);
    if (github.warning) warnings.push(github.warning);
    if (!github.ok) errors.push(github.error);

    const reach = await checkReachability(target, config);
    if (!reach.ok) errors.push(reach.error);
  }

  return { file, label, target, errors, warnings };
}

module.exports = {
  validateEntry,
  checkGithubRepo,
  checkReachability
};
