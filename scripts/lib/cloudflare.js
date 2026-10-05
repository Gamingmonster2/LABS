'use strict';

/**
 * cloudflare.js
 * Minimal Cloudflare API v4 client - only the DNS record operations labs.ly needs.
 */

const API_BASE = 'https://api.cloudflare.com/client/v4';

function createClient(token) {
  if (!token) {
    throw new Error('CLOUDFLARE_API_TOKEN is not set');
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  async function request(method, endpoint, body) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) {
      const detail =
        (data.errors || []).map((e) => e.message).join('; ') || res.statusText;
      throw new Error(`Cloudflare API ${method} ${endpoint} failed: ${detail}`);
    }
    return data.result;
  }

  /** List every CNAME record in the zone, following pagination. */
  async function listCnames(zoneId) {
    const records = [];
    let page = 1;

    for (;;) {
      const result = await request(
        'GET',
        `/zones/${zoneId}/dns_records?type=CNAME&per_page=100&page=${page}`
      );
      records.push(...(result || []));
      if (!result || result.length < 100) {
        break;
      }
      page += 1;
    }

    return records;
  }

  return {
    listCnames,
    createRecord: (zoneId, record) => request('POST', `/zones/${zoneId}/dns_records`, record),
    updateRecord: (zoneId, id, record) => request('PUT', `/zones/${zoneId}/dns_records/${id}`, record)
  };
}

module.exports = { createClient, API_BASE };
