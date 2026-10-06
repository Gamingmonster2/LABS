'use strict';

/**
 * entry-file.js
 * Shared parser for labs.ly request files inside cnames/.
 *
 * One single, simple format:
 *
 *   cnames/<label>.json
 *   { "target": "https://username.github.io/project" }
 *
 * The subdomain label is always the file name without the ".json" extension.
 */

const fs = require('node:fs');
const path = require('node:path');

/**
 * Is `name` an entry file we should process?
 * Only "<label>.json" files count; dotfiles such as .gitkeep are ignored.
 */
function isEntryFile(name) {
  const base = path.basename(name);
  return !base.startsWith('.') && base.toLowerCase().endsWith('.json');
}

/**
 * Derive the subdomain label from a file name ("myname.json" -> "myname").
 */
function deriveLabel(name) {
  const base = path.basename(name);
  return base.toLowerCase().endsWith('.json') ? base.slice(0, -'.json'.length) : base;
}

/**
 * Parse one entry file into { label, target, errors }.
 * Never throws: parse problems are returned as human readable errors.
 */
function parseEntryFile(file) {
  const label = deriveLabel(file);
  const errors = [];

  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (error) {
    return { label, target: '', errors: [`could not read file: ${error.message}`] };
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (error) {
    return { label, target: '', errors: [`file must contain valid JSON (${error.message})`] };
  }

  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return {
      label,
      target: '',
      errors: ['file must contain a JSON object, e.g. {"target": "https://example.com"}']
    };
  }

  if (typeof data.target !== 'string' || data.target.trim() === '') {
    return {
      label,
      target: '',
      errors: ['JSON must contain a non-empty "target" string, e.g. {"target": "https://example.com"}']
    };
  }

  return { label, target: data.target.trim(), errors };
}

module.exports = { isEntryFile, deriveLabel, parseEntryFile };
