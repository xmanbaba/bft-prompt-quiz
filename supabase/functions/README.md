# Edge Functions

Two functions, restored here after being lost in the self-hosted migration so they live in version control from now on.

## Functions

- **score-mcq** — deterministic lookup against `bft_prompt_quiz.mcq_answer_keys`. Called from `src/pages/MCQRound.tsx`. No AI call, no external dependency beyond the database.
- **score-response** — AI-graded scoring of a single practical scenario response, called from `src/pages/Scoring.tsx`. Calls OpenRouter (free tier), trying `meta-llama/llama-3.3-70b-instruct:free` → `google/gemma-3-27b-it:free` → `mistralai/mistral-small-3.1-24b-instruct:free` in order until one succeeds. Writes results directly to the `responses` row; the client ignores the HTTP response and just polls the row via `Result.tsx`.

Both functions read/write the `bft_prompt_quiz` Postgres schema (not `public`) — the Supabase client in each is initialised with `{ db: { schema: 'bft_prompt_quiz' } }`.

## Required secrets (VPS `.env`)

Self-hosted Supabase reads Edge Function secrets from the `.env` file used by the `docker compose` stack (`~/supabase/docker/.env` on the VPS), not from a dashboard. Two secrets are required:

| Secret | Notes |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Already present in the VPS `.env` — no action needed. |
| `OPENROUTER_KEY` | Not yet set. Generate a fresh key at openrouter.ai (the old key from the pre-migration HTML file is burned) and add it to `~/supabase/docker/.env`, then restart the stack: `docker compose up -d` (or at minimum `docker compose restart functions`) from `~/supabase/docker`. |

Only `score-response` uses `OPENROUTER_KEY`; `score-mcq` doesn't call OpenRouter at all.

## Deploying

From the repo root:

```bash
./deploy-functions.sh
```

This copies `score-mcq/` and `score-response/` to `~/supabase/docker/volumes/functions/` on the VPS via `scp`, then restarts the `functions` container over SSH. Edit the `VPS_HOST` / `VPS_USER` / paths at the top of the script if the server changes.

After deploying, tail logs to confirm both functions loaded cleanly:

```bash
ssh root@191.215.37.28 'cd ~/supabase/docker && docker compose logs -f functions'
```
