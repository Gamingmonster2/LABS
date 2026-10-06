# Contributing to labs.ly

Thanks for helping labs.ly stay a curated list of real projects. This guide covers submitting a
subdomain and what the automated checks look for.

## Before you start

Read the [Acceptable Use Policy](README.md#acceptable-use-policy). If your project relies on
advertising, tracking, spam, or content that violates the policy, it will be rejected.

## 1. Fork and clone

```bash
git clone https://github.com/<you>/LABS.git
cd LABS
```

## 2. Add your entry file

Create a single file inside `cnames/`:

- **File name:** `<yourname>.json` (for example `myproject.json`)
  - lowercase `a-z`, `0-9` and inner `-` only
  - 2 to 40 characters before `.json`
  - must not be a reserved word (see `config/reserved-words.json` and the `domains/` registry)
- **Content:** a small JSON object with one `"target"` key pointing to a live `https://` URL

Example - `cnames/myproject.json`:

```json
{"target": "https://username.github.io/project"}
```

If the target is a GitHub repository, labs.ly points the CNAME at `<owner>.github.io`
(GitHub Pages). Otherwise the URL's hostname is used directly.

## 3. Validate locally

Requires Node.js 18+.

```bash
npm run smoke
```

This runs the same validation the CI will run, then rebuilds the front-end index. Fix any
`FAIL` lines before opening the pull request.

## 4. Open a pull request

- Branch from `main` and open a PR targeting `main`.
- Describe the project and confirm it follows the Acceptable Use Policy.
- The `Validate entries` workflow runs automatically. Only the files you added are checked.

## What CI checks

| Check | Fails when |
| --- | --- |
| Format | name has invalid characters, wrong length, or is not `*.json` |
| Reserved words | label is in `config/reserved-words.json` |
| Content | file is empty, has invalid JSON, or is missing a valid `target` URL |
| Scheme | URL is not `https://` |
| GitHub repo | target is a GitHub repo that does not exist |
| Reachability | target is unreachable or returns an error status |
| Parked domains | target redirects to a known parking/for-sale service |

## What happens after merge

1. The `Deploy labs.ly` workflow rebuilds `data/active.json`.
2. It creates or updates the Cloudflare CNAME record for your subdomain.
3. The landing page is redeployed.

Your subdomain should resolve within a few minutes. DNS propagation may take longer depending
on how long caches hold the previous answer.

## Reporting abuse

If you find a subdomain violating the Acceptable Use Policy, open an issue titled
`Abuse report: <subdomain>` with the details. We will review and act.
