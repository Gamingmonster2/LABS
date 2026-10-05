'use strict';

/**
 * build-site.js
 * Assembles the static site into dist/ so the Pages artifact contains only
 * front-end assets (never the scripts, workflows or config).
 */

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');

const ASSETS = ['index.html', 'assets', 'data', 'CNAME'];

function copy(rel) {
  const src = path.join(root, rel);
  const dest = path.join(dist, rel);
  if (!fs.existsSync(src)) {
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
}

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

for (const rel of ASSETS) {
  copy(rel);
}

console.log(`[labs.ly] Static site assembled in ${path.relative(root, dist)}/`);
