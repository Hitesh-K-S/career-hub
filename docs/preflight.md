# Preflight and security findings

Recorded 2026-09-27, before any of the deployment work started. Read this before
you touch `AccoSpark` or `AI-Data_Cleaning_Chatbot` again.

## Already fixed

| Finding | Fix |
|---|---|
| `expenseTrackerBot/.gitignore` had `credentials.json   # for your Google API creds` | gitignore has **no inline-comment syntax**. The whole line, comment included, was the pattern, so it never matched. The service-account key was one `git add .` away from being committed. Split onto two lines. Committed as `7547cbd`. |
| `AI-Data_Cleaning_Chatbot` tracked `backend/ai_data_cleaning.db` | Runtime SQLite DB was under version control, which contradicts that project's own handoff doc. Reverted. |
| `herrhythm` and `volog` were not Git repositories | 395 MB and 422 MB of untracked work with no history and no safety net. `git init` + initial commit: `herrhythm` `e8799b9` (440 files), `volog` `e402e72` (59 files). |
| `AccoSpark` had 43 modified files and `cerebro` had 30, all uncommitted | WIP checkpointed: `AccoSpark` `372f74c`, `cerebro` `bf83d39`. Nothing was discarded. |

## Clean: no secrets in Git history

Every commit in `AccoSpark`, `cerebro`, `AI-Data_Cleaning_Chatbot` and
`expenseTrackerBot` was scanned for `.env` blobs and `credentials*.json` blobs
containing non-empty secret assignments. **Zero hits.** No history rewrite
needed, no force-push needed.

The `.env` paths that appear in the *commits* are `.env.example` files. They
are templates, not secrets.

## Still open: rotate these

The exposure is on **local disk only**, but these are real live credentials.
Anything that syncs a folder to a cloud drive, or any future `git add .`, will
leak them.

| # | Where | What | Action needed |
|---|---|---|---|
| 1 | `projects/expenseTrackerBot/credentials.json` | Google **service-account private key** | **Highest priority.** Disable the key in GCP IAM, issue a new one, re-download. Delete the local copy. It is now gitignored, but the old key is still valid. |
| 2 | `projects/AccoSpark/.env` | `GOOGLE_CLIENT_SECRET`, `OPENROUTER_API_KEY`, `GOOGLE_CLIENT_ID`, `MAIL_PASSWORD`, `DB_PASSWORD` | Rotate the Google OAuth secret and the OpenRouter key. The others are local-only but reuse them nowhere. |
| 3 | `projects/AI-Data_Cleaning_Chatbot/.env` | `GOOGLE_API_KEY` | Rotate in Google AI Studio. |
| 4 | `projects/expenseTrackerBot/.env` | `DISCORD_TOKEN` | Regenerate via Discord developer portal. |
| 5 | `projects/cerebro/.env` | `GOOGLE_CLIENT_ID` | Client ID alone is not secret, but rotate alongside #2. |

All six `.env` files are correctly gitignored. `credentials.json` is now
gitignored too.

## Standing rules

- One `.env` per project, never committed, always paired with a committed
  `.env.example` that has the same keys and blank values.
- `expenseTrackerBot` had a `credentials.json` and no `.env.example`. Anything
  that reads a secret file gets an example file.
- Gitignore comments go on their own line. This is not optional and it is not
  obvious.
- Before any `git add .` in a project holding keys, run
  `git status --porcelain` and read the `??` lines.
- Deploying to AWS means these secrets go to **Secrets Manager**, not to a
  `.env` on an instance. That is a project milestone, not a nice-to-have.

## Two things to fix before you rely on GitHub

| Finding | Why it matters |
|---|---|
| `AI-Data_Cleaning_Chatbot` origin is `github.com/**GyroXZeppeli**/AI-Data_Cleaning_Chatbot.git` | That is not your account. You cannot push to it, and the AI portfolio project is supposed to be *your* proof. Change the origin, or create your own repo and make it the origin. |
| `cerebro` origin is `https://github.com/Hitesh-K-S/cerebro.git` over HTTPS | Fine, but your other repos use SSH (`git@github.com:...`). Normalise to SSH so you are not re-authenticating over HTTPS. |
