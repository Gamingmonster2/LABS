'use strict';

/**
 * validate-domains.js
 * Validates the reserved labs.ly domain registry in domains/ and protects the
 * premium labels from being claimed or overridden through cnames/.
 *
 * Sources of truth:
 *   - RESERVED_WORDS (hard guard: numeric labels, "lab", premium/luxury words)
 *   - config/reserved-words.json (extended contributor blocklist)
 *
 * Every reserved domain in domains/ must belong to the same owner and CNAME:
 *   owner: admin@labs.ly
 *   cname: labs-ly.github.io
 *
 * Usage:
 *   node scripts/validate-domains.js            # full registry + collision check
 *   node scripts/validate-domains.js 1 lab pro  # also check specific labels
 */

const fs = require('node:fs');
const path = require('node:path');

const { isEntryFile, deriveLabel } = require('./lib/entry-file');

const ROOT = path.resolve(__dirname, '..');

const OWNER = 'admin@labs.ly';
const CNAME = 'labs-ly.github.io';

// Hard-guarded labels. Each one is reserved for the owner and must never be
// claimable or overridable through a cnames/ entry.
const RESERVED_WORDS = [
  // 1. numeric labels
  '1', '2', '3', '4', '5', '10',
  // 2. the domain keyword itself
  'lab',
  // 3. premium words
  'pro', 'vip', 'hub',
  // 4. luxury keyword words
  'ai', 'dev', 'app'
];

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function validateRecordFile(file, config, reservedSet, errors) {
  const name = path.basename(file);

  let record;
  try {
    record = loadJson(file);
  } catch (error) {
    errors.push(`${name}: invalid JSON (${error.message})`);
    return null;
  }

  const expectedLabel = name.replace(/\.json$/i, '');
  const expectedSubdomain = `${expectedLabel}.${config.domain}`;

  if (record.label !== expectedLabel) {
    errors.push(`${name}: "label" must be "${expectedLabel}"`);
  }
  if (record.subdomain !== expectedSubdomain) {
    errors.push(`${name}: "subdomain" must be "${expectedSubdomain}"`);
  }
  if (record.owner !== OWNER) {
    errors.push(`${name}: "owner" must be "${OWNER}"`);
  }
  if (record.cname !== CNAME) {
    errors.push(`${name}: "cname" must be "${CNAME}"`);
  }
  if (record.reserved !== true) {
    errors.push(`${name}: "reserved" must be true`);
  }
  if (!reservedSet.has(expectedLabel)) {
    errors.push(`${name}: label "${expectedLabel}" is not present in RESERVED_WORDS`);
  }

  return record;
}

function scanCnames(config, reservedSet, errors) {
  const cnamesDir = path.join(ROOT, config.cnamesDir);
  if (!fs.existsSync(cnamesDir)) {
    return;
  }

  for (const name of fs.readdirSync(cnamesDir)) {
    if (!isEntryFile(name)) {
      continue;
    }
    const label = deriveLabel(name).toLowerCase();
    if (reservedSet.has(label)) {
      errors.push(`cnames/${name}: label "${label}" is reserved and cannot be claimed`);
    }
  }
}

function main() {
  const config = loadJson(path.join(ROOT, 'config', 'validation.json'));
  const configWords = (loadJson(path.join(ROOT, 'config', 'reserved-words.json')).words || []).map(
    (word) => word.toLowerCase()
  );

  // Merge the hard guard with the editable blocklist for collision checks.
  const reservedSet = new Set([...RESERVED_WORDS, ...configWords].map((word) => word.toLowerCase()));

  const errors = [];
  const domainsDir = path.join(ROOT, 'domains');

  if (!fs.existsSync(domainsDir)) {
    console.error(`[labs.ly] domains/ directory not found at ${domainsDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(domainsDir).filter((name) => name.toLowerCase().endsWith('.json'));
  const records = [];
  for (const name of files) {
    const record = validateRecordFile(path.join(domainsDir, name), config, reservedSet, errors);
    if (record) {
      records.push(record);
    }
  }

  // Every hard-guarded word must have a matching registry file.
  const registered = new Set(records.map((record) => record.label));
  for (const word of RESERVED_WORDS) {
    if (!registered.has(word)) {
      errors.push(`domains/${word}.json is missing for reserved word "${word}"`);
    }
  }

  // No contributor entry may collide with a reserved label.
  scanCnames(config, reservedSet, errors);

  // Optional: verify specific labels passed on the command line are reserved.
  for (const arg of process.argv.slice(2)) {
    const label = arg.toLowerCase();
    if (!reservedSet.has(label)) {
      errors.push(`"${label}" is not a reserved word`);
    }
  }

  console.log(
    `[labs.ly] Reserved registry: ${records.length} record(s), ${RESERVED_WORDS.length} hard-guarded word(s).`
  );

  if (errors.length > 0) {
    console.log('');
    for (const error of errors) {
      console.log(`FAIL  ${error}`);
    }
    console.log(`\n[labs.ly] ${errors.length} problem(s) found.`);
    process.exit(1);
  }

  console.log(`[labs.ly] All reserved domains valid. owner=${OWNER} cname=${CNAME}`);
}

main();

module.exports = { RESERVED_WORDS, OWNER, CNAME };
