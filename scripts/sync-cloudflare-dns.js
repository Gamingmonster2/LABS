'use strict';

/**
 * sync-cloudflare-dns.js
 * Creates or updates the CNAME record for every active labs.ly entry using the
 * Cloudflare API. Safe to run repeatedly: unchanged records are skipped.
 *
 * Required environment variables:
 *   CLOUDFLARE_API_TOKEN  - scoped to Zone:DNS:Edit
 *   CLOUDFLARE_ZONE_ID    - the labs.ly zone id
 */

const fs = require('node:fs');
const path = require('node:path');

const { createClient } = require('./lib/cloudflare');

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/**
 * Resolve the CNAME target host for an entry.
 * GitHub repo URLs map to <owner>.github.io (GitHub Pages project site).
 * Any other URL maps to its hostname.
 */
function toCnameTarget(entry) {
  try {
    const url = new URL(entry.target);
    if (url.hostname === 'github.com') {
      const owner = url.pathname.split('/').filter(Boolean)[0];
      if (owner) {
        return `${owner}.github.io`;
      }
    }
    return url.hostname;
  } catch {
    return null;
  }
}

async function main() {
  const root = path.resolve(__dirname, '..');
  const config = loadJson(path.join(root, 'config', 'validation.json'));
  const indexFile = path.join(root, config.indexFile);

  if (!fs.existsSync(indexFile)) {
    throw new Error(`Index file "${config.indexFile}" not found. Run "npm run build:index" first.`);
  }

  const index = loadJson(indexFile);
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;

  if (!zoneId) {
    throw new Error('CLOUDFLARE_ZONE_ID is not set');
  }

  const client = createClient(token);

  console.log(`[labs.ly] Syncing ${index.entries.length} CNAME record(s) for ${index.domain}...`);

  const existing = await client.listCnames(zoneId);
  const byName = new Map(existing.map((record) => [record.name.toLowerCase(), record]));

  let created = 0;
  let updated = 0;
  let unchanged = 0;

  for (const entry of index.entries) {
    const target = toCnameTarget(entry);
    if (!target) {
      console.log(`SKIP   ${entry.subdomain} (invalid target)`);
      continue;
    }

    const desired = {
      type: 'CNAME',
      name: entry.subdomain,
      content: target,
      proxied: false,
      ttl: 1
    };

    const record = byName.get(entry.subdomain.toLowerCase());

    if (!record) {
      await client.createRecord(zoneId, desired);
      console.log(`CREATE ${entry.subdomain} -> ${target}`);
      created += 1;
    } else if (record.content.toLowerCase() !== target.toLowerCase()) {
      await client.updateRecord(zoneId, record.id, desired);
      console.log(`UPDATE ${entry.subdomain} -> ${target}`);
      updated += 1;
    } else {
      unchanged += 1;
    }
  }

  console.log(
    `\n[labs.ly] DNS sync complete. created=${created} updated=${updated} unchanged=${unchanged}`
  );
}

main().catch((error) => {
  console.error(`[labs.ly] DNS sync failed: ${error.stack || error.message}`);
  process.exit(1);
});
