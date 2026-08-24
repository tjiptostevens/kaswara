# AGENTS.md

## Cursor Cloud specific instructions

### What this project is

Kaswara is a single-product React 19 + Vite 8 SPA (Indonesian community/household finance app). There is no custom backend server — all data, auth, storage, and realtime come from **Supabase**. For local development the Supabase stack runs in Docker via the Supabase CLI, and 25 SQL migrations in `supabase/migrations/` define the schema (RLS policies, seed categories, workflows, storage bucket, permission matrix, simple/advance accounting).

### Services and how to run them

The update script only refreshes npm dependencies. Docker + the Supabase stack are NOT started automatically — start them yourself each session:

- Start the Docker daemon (systemd is not running in this VM):
  `sudo bash -c 'nohup dockerd > /var/log/dockerd.log 2>&1 &'` then wait ~8s and confirm with `sudo docker info`.
- Start the local Supabase stack (Postgres, Auth, PostgREST, Storage, Realtime, Studio) from the repo root. Docker commands need sudo here, so run the CLI under sudo while preserving PATH:
  `sudo -E env "PATH=$PATH" npx supabase start`
  - API/PostgREST: `http://127.0.0.1:54321` · Postgres: `54322` · Studio: `54323` · Mailpit: `54324`
  - To re-apply migrations from scratch (drops all data, including auth users): `sudo -E env "PATH=$PATH" npx supabase db reset`
- Start the Vite dev server: `npm run dev` → `http://localhost:5173`

### Non-obvious gotchas

- **`auto_expose_new_tables = true` is required.** The migrations contain no explicit `GRANT`s to the Data API roles (`anon`/`authenticated`). Recent Supabase versions default to NOT auto-exposing new `public` tables, which makes every query fail with `permission denied for table ...`. `supabase/config.toml` sets `auto_expose_new_tables = true` under `[api]` to restore the legacy behavior the app was written for. If you see `permission denied for table`, confirm this flag is set and re-run `supabase db reset`. (The CLI prints a deprecation warning for this flag — that is expected.)
- **`.env.local` is required and git-ignored.** The frontend reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. For the local stack these are deterministic demo values, so recreate `.env.local` at the repo root if it is missing:
  ```
  VITE_SUPABASE_URL=http://127.0.0.1:54321
  VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
  VITE_APP_NAME=Kaswara
  ```
  (The legacy JWT `ANON_KEY` from `supabase start` output is used, not the newer `PUBLISHABLE_KEY`.)
- **Local auth has email confirmations disabled** (`config.toml` `[auth.email] enable_confirmations = false`), so signups log in immediately without an email step.
- **Signup flow:** sign up → create/join an organisasi (or "Lewati" for personal mode) → dashboard. A user who creates a new organisasi becomes `bendahara` and can create transactions.
- **Edge functions** in `supabase/functions/` are served by the `supabase_edge_runtime` container from `supabase start`. Only `create-anggota-with-auth` is wired in the UI (member invite via `anggotaStore`). `send-reminder` / `send-whatsapp` need `RESEND_API_KEY` / `WA_API_TOKEN` and are not wired; reminder still queries obsolete iuran status `belum_bayar` (see `docs/EDGE_FUNCTIONS.md`).
- **Permission matrix (migrations 022–024):** per-member scopes on `transaksi`/`iuran`/`rab`/`rap`/`surat`. UI uses `useAuth().can()` / `canForRecord()`; persists via RPC `save_anggota_permissions` (or edge upsert on create). Personal workspace bypasses the matrix in the frontend. Details: `docs/PERMISSIONS.md`.
- **Accounting (migration 025):** new orgs auto-seed COA + default Cash/Bank via trigger. Journals post when a transaksi is **submitted** (not on draft create) and require `akun_keuangan_id` (plus `akun_tujuan_id` for transfers). Activate opening balances with RPC `aktifkan_sistem_akunting` from Settings. Mode Simple/Advance is a per-user UI preference (`pengaturan_user`), not a data fork. Engineering details: `docs/AKUNTING.md`.
- **Publik transparansi (013):** enable `organisasi.publik_aktif` (+ optional `publik_slug`) in Settings; anon RLS only exposes org/transaksi/kategori for active orgs. Prefer `/publik/{uuid|slug}` — `PublikLandingPage` currently references `supabase` without importing it. Details: `docs/PUBLIK.md`.
- **Surat (018 + 022):** table `permintaan_surat`; UI gates via matrix resource `surat`; SELECT RLS is member-wide (own/all filtered in UI). Details: `docs/SURAT.md`.
- **Iuran (014 + 020):** statuses `draft|diajukan|cancelled|amended` (not `belum_bayar`/`lunas`); unique active row per anggota+kategori+periode; `ajukanIuran` inserts submitted transaksi **without** `akun_keuangan_id` (no journal). Details: `docs/IURAN.md`.
- After pulling schema changes, prefer `supabase db reset` locally so views (`v_saldo_akun_keuangan`, `v_saldo_coa`) and RPCs match the frontend.

### Lint / test / build

- **Lint is currently broken as a repo defect, not a setup issue:** `package.json` defines `npm run lint` (ESLint 9), but the repo ships no `eslint.config.js` flat-config file, so ESLint 9 errors out with "couldn't find an eslint.config.(js|mjs|cjs) file." Adding a config is a code change outside environment setup.
- **No automated tests** exist in the repo.
- Build: `npm run build`; preview a production build: `npm run preview` (port `4173`).
