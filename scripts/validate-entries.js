'use strict';

/**
 * validate-entries.js
 * Entry point for the labs.ly validation engine.
 *
 * It validates ONLY the entry files added in the current pull request. The full
 * catalog is never re-checked, which keeps CI fast and predictable.
 *
 * Usage:
 *   node scripts/validate-entries.js              # auto-detect new files via git
 *   node scripts/validate-entries.js cnames/a.json cnames/b.json
 */

const fs = require('node:fs');
const path = require('node:path');

const { validateEntry } = require('./lib/validate-entry');
const { getAddedFiles } = require('./lib/git-changes');
const { isEntryFile } = require('./lib/entry-file');

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

async function main() {
  const root = path.resolve(__dirname, '..');
  const config = loadJson(path.join(root, 'config', 'validation.json'));
  const reservedConfig = loadJson(path.join(root, 'config', 'reserved-words.json'));
  const reservedWords = new Set((reservedConfig.words || []).map((w) => w.toLowerCase()));

  // Explicit file arguments win; otherwise isolate the newly added files.
  let files = process.argv.slice(2);
  if (files.length > 0) {
    files = files.map((f) => (path.isAbsolute(f) ? f : path.resolve(process.cwd(), f)));
  } else {
    files = getAddedFiles(config.cnamesDir)
      .filter((f) => isEntryFile(path.basename(f)))
      .map((f) => path.join(root, f));
  }

  if (files.length === 0) {
    console.log('[labs.ly] No newly added entry files detected. Nothing to validate.');
    return;
  }

  console.log(`[labs.ly] Validating ${files.length} newly added entry file(s)...\n`);

  const results = [];
  for (const file of files) {
    if (!fs.existsSync(file)) {
      results.push({ file, errors: ['file no longer exists'], warnings: [] });
      continue;
    }
    // Sequential execution keeps network checks gentle on rate limits.
    results.push(await validateEntry(file, config, reservedWords));
  }

  let failed = 0;
  for (const result of results) {
    const name = path.basename(result.file || 'unknown');

    if (result.errors && result.errors.length > 0) {
      failed += 1;
      console.log(`FAIL  ${name}`);
      for (const error of result.errors) console.log(`      - ${error}`);
    } else {
      console.log(`PASS  ${name}  ->  ${result.target || ''}`);
    }

    for (const warning of result.warnings || []) {
      console.log(`      ! ${warning}`);
    }
  }

  console.log(`\n[labs.ly] ${results.length - failed}/${results.length} passed.`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`[labs.ly] Validation crashed: ${error.stack || error.message}`);
  process.exit(1);
});
