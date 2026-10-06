'use strict';

/**
 * build-index.js
 * Reads every entry in cnames/ and writes data/active.json, the file consumed
 * by the static front-end. No templating engine required.
 */

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { isEntryFile, parseEntryFile } = require('./lib/entry-file');

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function addedDate(root, relFile) {
  try {
    const value = execFileSync('git', ['log', '-1', '--format=%cI', '--', relFile], {
      cwd: root,
      encoding: 'utf8'
    }).trim();
    return value || null;
  } catch {
    return null;
  }
}

function main() {
  const root = path.resolve(__dirname, '..');
  const config = loadJson(path.join(root, 'config', 'validation.json'));
  const domain = config.domain;
  const cnamesDir = path.join(root, config.cnamesDir);

  if (!fs.existsSync(cnamesDir)) {
    console.warn(`[labs.ly] Directory "${config.cnamesDir}" not found. Writing an empty index.`);
  }

  const names = fs.existsSync(cnamesDir)
    ? fs
        .readdirSync(cnamesDir)
        .filter((name) => isEntryFile(name) && fs.statSync(path.join(cnamesDir, name)).isFile())
    : [];

  const entries = names.map((name) => {
    const file = path.join(cnamesDir, name);
    const { label, target } = parseEntryFile(file);

    return {
      subdomain: `${label}.${domain}`,
      label,
      target,
      addedAt: addedDate(root, `${config.cnamesDir}/${name}`)
    };
  });

  entries.sort((a, b) => a.label.localeCompare(b.label));

  const outFile = path.join(root, config.indexFile);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(
    outFile,
    `${JSON.stringify(
      { domain, generatedAt: new Date().toISOString(), count: entries.length, entries },
      null,
      2
    )}\n`
  );

  console.log(`[labs.ly] Wrote ${entries.length} entries to ${config.indexFile}`);
}

main();
