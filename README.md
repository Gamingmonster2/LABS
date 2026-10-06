# labs.ly

Free subdomains for **real, live projects**.

Repository: <https://github.com/Gamingmonster2/LABS>

`labs.ly` gives your project a friendly `yourname.labs.ly` address that points at your
GitHub Pages site (or any HTTPS URL). Submissions are validated automatically, and once a
pull request is merged, Cloudflare creates the DNS record for you.

---

## How it works

1. A contributor adds **one file** to the `cnames/` directory.
2. The file name is the requested subdomain, e.g. `myproject.json`.
3. The file content is a small JSON object: `{"target": "https://..."}`.
4. A pull request runs the validation engine over **only the newly added files**.
5. When the pull request is merged to `main`, the deploy workflow:
   - rebuilds `data/active.json`,
   - creates or updates the Cloudflare CNAME record,
   - publishes the static landing page.

```text
cnames/
└── myproject.json      # contains: {"target": "https://github.com/owner/repo"}
```

---

## Repository layout

| Path | Purpose |
| --- | --- |
| `cnames/` | Staging area - one file per requested subdomain |
| `domains/` | Reserved domain registry (numeric, premium and keyword labels owned by admin@labs.ly) |
| `config/reserved-words.json` | Blocked labels (brand, infrastructure, abuse-prone names) |
| `config/validation.json` | Domain, limits, timeouts and blocked URL patterns |
| `scripts/validate-entries.js` | Validation entry point (runs only on new files) |
| `scripts/validate-domains.js` | Validates the reserved registry and blocks label collisions |
| `scripts/build-index.js` | Generates `data/active.json` for the front-end |
| `scripts/sync-cloudflare-dns.js` | Creates/updates Cloudflare CNAME records |
| `scripts/build-site.js` | Assembles the static site into `dist/` |
| `.github/workflows/validate.yml` | CI validation on every pull request |
| `.github/workflows/deploy.yml` | DNS sync + Pages deploy on merge to `main` |
| `index.html`, `assets/` | Static landing page (yellow/black theme) |

---

## Submitting a subdomain

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full walkthrough. In short:

1. Fork this repository: <https://github.com/Gamingmonster2/LABS>.
2. Create a file in `cnames/` named after your subdomain, e.g. `myproject.json`.
3. Put your project link inside it as JSON:

   ```json
   {"target": "https://username.github.io/project"}
   ```

4. Open a pull request against `main`.
5. Fix anything CI reports, then wait for review.
6. After merge, your subdomain is live within a few minutes.

### Entry rules

- File name: lowercase letters, numbers and inner hyphens only, 2-40 characters,
  followed by `.json`.
- Content: a JSON object with a single `"target"` key holding one `https://` URL.
- GitHub targets must point to a repository that really exists.
- The target must be reachable and must not redirect to a parked or for-sale domain.
- The label must not appear in `config/reserved-words.json` or the reserved registry in `domains/`.

---

## Reserved domains

A set of premium `labs.ly` subdomains is reserved for the owner (`admin@labs.ly`) and points to
the same target (`CNAME: labs-ly.github.io`). The registry lives in `domains/` as one JSON file
per label:

| Category | Labels |
| --- | --- |
| Numeric | `1`, `2`, `3`, `4`, `5`, `10` |
| Domain keyword | `lab` |
| Premium | `pro`, `vip`, `hub` |
| Luxury keywords | `ai`, `dev`, `app` |

`scripts/validate-domains.js` enforces three rules:

1. Every record is valid JSON with `owner: admin@labs.ly` and `cname: labs-ly.github.io`.
2. The hard-guarded `RESERVED_WORDS` list matches the registry files on disk.
3. No `cnames/` entry may collide with a reserved label.

Run it locally with `npm run validate:domains`.

---

## Cloudflare DNS setup

The deploy workflow talks directly to the Cloudflare API to create the CNAME records.

### 1. Add the zone

Add `labs.ly` as a zone in your Cloudflare account.

### 2. Create an API token

Create a scoped API token with:

- **Permissions:** `Zone` -> `DNS` -> `Edit`
- **Zone resources:** include -> specific zone -> `labs.ly`

### 3. Add repository secrets

In the GitHub repository, go to **Settings -> Secrets and variables -> Actions** and add:

| Secret | Value |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | the scoped token from step 2 |
| `CLOUDFLARE_ZONE_ID` | the zone id shown on the `labs.ly` overview page |

`GITHUB_TOKEN` is provided automatically and is only used to raise GitHub API rate limits
during validation.

### 4. Enable GitHub Pages

Set **Settings -> Pages -> Build and deployment -> Source** to **GitHub Actions**, then set your
custom domain to `labs.ly` (the deploy bundle ships a `CNAME` file for this).

---

## Local development

Requires Node.js 18 or newer.

```bash
# validate the files you just added (uses git to find new files)
npm run validate

# or validate specific files
node scripts/validate-entries.js cnames/myproject.json

# validate the reserved domain registry
npm run validate:domains

# regenerate the front-end index
npm run build:index

# run both, like CI would
npm run smoke

# preview the DNS changes (requires the two environment variables)
CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ZONE_ID=... npm run sync:dns
```

To preview the landing page locally, serve the project root with any static server, then open
`index.html`. The page loads `data/active.json`, so run `npm run build:index` first.

---

## Acceptable Use Policy

By requesting or using a `labs.ly` subdomain you agree to the following. Breaking this policy
results in removal of the entry, revocation of the DNS record, and a block on future requests.

### 1. Real, live projects only
The target must be a working website for a genuine project. Placeholder pages, empty
repositories, link shorteners, and parked or for-sale pages are not allowed.

### 2. No advertising, tracking or spam
No ad networks, pop-ups, forced redirects, affiliate spam, crypto faucets, or aggressive
tracking. Content must be suitable for a general audience.

### 3. No abusive or illegal content
No harassment, hate speech, sexual content involving minors, malware, phishing, fraud,
piracy, or anything that violates applicable law or the rights of others.

### 4. No impersonation or brand abuse
Do not request names that impersonate labs.ly, its maintainers, or any third-party brand.
Reserved and misleading names are rejected automatically.

### 5. Security and integrity
Do not use a subdomain for credential harvesting, malware distribution, botnets, or to
misrepresent your relationship with labs.ly. We may suspend any subdomain at any time to
protect the reputation of the domain.

### 6. Enforcement and takedown
We review abuse reports and, where warranted, remove the entry, revoke the DNS record, and
block future requests. Report abuse through the repository's issue tracker.

### 7. No warranty
Subdomains are provided free of charge, as-is, with no guarantee of availability.

The same policy is published on the landing page (`index.html`, section `#aup`) and in
[AUP.md](AUP.md).

---

## Credits and license

labs.ly is maintained at <https://github.com/Gamingmonster2/LABS> and released under the
[MIT License](LICENSE).
