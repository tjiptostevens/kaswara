# Local Development & Troubleshooting — Runbook

Panduan operasional untuk menjalankan Kaswara di mesin lokal (Docker + Supabase CLI + Vite). Setup Cloud Agent detail: [AGENTS.md](../AGENTS.md). Fitur subsystem: lihat index di [README](../README.md#dokumentasi-engineering).

## Intent

Satu checklist agar contributor bisa:

1. Naikkan stack lokal tanpa tebak-tebakan port/env.
2. Mendiagnosis error PostgREST/RLS/jurnal yang sering muncul setelah pull migration baru.

## Prasyarat

- Node.js ≥ 18, npm
- Docker daemon (di VM tanpa systemd: start manual — lihat langkah di bawah)
- Supabase CLI via `npx supabase` (tidak wajib install global)

## Boot sequence

```bash
# 1) Docker (hanya jika daemon belum jalan)
sudo bash -c 'nohup dockerd > /var/log/dockerd.log 2>&1 &'
# tunggu ~8s
sudo docker info

# 2) Env frontend (git-ignored)
cat > .env.local <<'EOF'
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
VITE_APP_NAME=Kaswara
EOF

# 3) Supabase stack (API 54321, DB 54322, Studio 54323, Mailpit 54324)
sudo -E env "PATH=$PATH" npx supabase start

# 4) Setelah pull migration baru — reset agar 001…025 + views/RPC sinkron
sudo -E env "PATH=$PATH" npx supabase db reset

# 5) App
npm install
npm run dev   # http://localhost:5173
```

**Catatan env:** pakai JWT `ANON_KEY` legacy dari output `supabase start`, bukan `PUBLISHABLE_KEY`. Confirmations email lokal dimatikan (`config.toml` → `[auth.email] enable_confirmations = false`) — signup langsung login.

**Storage:** bucket `rap-foto` dibuat migration `016` (public read, 10MB). Reset DB sudah mengisi bucket; di hosted project pastikan bucket ada (lihat README).

## Port map

| Layanan | URL / port |
|---------|------------|
| Vite | `http://localhost:5173` |
| PostgREST / Auth / Storage API | `http://127.0.0.1:54321` |
| Postgres | `127.0.0.1:54322` |
| Studio | `http://127.0.0.1:54323` |
| Mailpit | `http://127.0.0.1:54324` |

## Smoke test singkat

1. Signup user baru → masuk dashboard (workspace **personal** otomatis; `/setup` opsional).
2. Sidebar → buat organisasi `rt_rw` → jadi `bendahara`.
3. **Pengaturan → Akunting:** aktifkan sistem + isi saldo awal (RPC `aktifkan_sistem_akunting`).
4. Buat transaksi pemasukan dengan **tempat uang** → submit → cek Tempat Uang / jurnal Advance.
5. (Opsional) Settings → aktifkan publik + slug → buka `/publik/{uuid|slug}` (bukan landing cari di `/publik` — lihat pitfalls).

## Troubleshooting

| Gejala | Penyebab yang sudah diverifikasi | Perbaikan |
|--------|----------------------------------|-----------|
| `permission denied for table …` pada query PostgREST | Migrations tanpa `GRANT` eksplisit ke `anon`/`authenticated`; CLI baru default **tidak** auto-expose | Pastikan `supabase/config.toml` → `[api] auto_expose_new_tables = true`, lalu `supabase db reset`. Warning deprecation dari CLI **diharapkan**. Field ini dihapus **2026-10-30** — setelah itu wajib `GRANT` eksplisit (lihat `docs/MIGRATIONS.md`). |
| Tabel/view/RPC “tidak ada” setelah pull | Migration lokal belum di-apply (mis. `025` akunting, views `v_saldo_*`) | `sudo -E env "PATH=$PATH" npx supabase db reset` (drop data termasuk auth users) |
| Transaksi submitted tapi saldo Tempat Uang / jurnal tidak berubah | Insert tanpa `akun_keuangan_id` (path iuran `ajukanIuran`, RAP `handleApprove`) atau submit mengabaikan error jurnal | Isi tempat uang di form transaksi manual; auto-tx dari iuran/RAP memang belum journal — lihat `docs/IURAN.md`, `docs/RAB_RAP.md`, `docs/AKUNTING.md` |
| Saldo Dashboard ≠ saldo Tempat Uang | `kasStore.hitungSaldo` = Σ pemasukan−pengeluaran baris transaksi **termasuk draft** (kecuali cancelled/amended); Tempat Uang pakai `v_saldo_akun_keuangan` | Jangan samakan kedua angka; transfer & jurnal void hanya mempengaruhi view |
| Crash / error di `/setup` tanpa login | Route di luar `ProtectedRoute`; submit memakai `user.id` tanpa null-guard | Buka `/setup` hanya setelah login — `docs/ONBOARDING.md` |
| “Organisasi tidak ditemukan” saat join by UUID | SELECT `organisasi` untuk non-member gagal kecuali `publik_aktif` atau `created_by` | Aktifkan transparansi publik, atau undang via edge invite / bagikan dari member — `docs/ONBOARDING.md` |
| `/publik` (landing) error runtime | `PublikLandingPage` memanggil `supabase` tanpa import | Pakai `/publik/:uuid` atau `/publik/:slug` (`PublikPage`) — `docs/PUBLIK.md` |
| Reminder email tidak menemukan iuran | `send-reminder` filter `status = 'belum_bayar'` (status dihapus di `014`) | Edge belum di-wire ke UI; perlu update query — `docs/EDGE_FUNCTIONS.md` |
| Matriks izin tidak tersimpan / RLS write gagal | Persist lewat RPC `save_anggota_permissions` (bypass RLS ketat) | Update anggota lewat `FormAnggota` / `anggotaStore`; jangan insert langsung ke `anggota_permission` dari client tanpa RPC — `docs/PERMISSIONS.md` |
| Personal vs org: menu hilang / `can()` selalu true | By design di workspace `tipe = personal` | Switch workspace di Sidebar |
| Lint `npm run lint` gagal | Tidak ada `eslint.config.*` untuk ESLint 9 | Defect repo; bukan masalah environment |
| Edge invite anggota gagal | Function butuh service role di runtime lokal | `create-anggota-with-auth` dilayani container edge dari `supabase start`; cek log container — `docs/EDGE_FUNCTIONS.md` |

## Setelah schema berubah

1. Prefer **`db reset`** lokal daripada apply partial — views (`v_saldo_akun_keuangan`, `v_saldo_coa`) dan RPC (`aktifkan_sistem_akunting`, `save_anggota_permissions`, `cancel_rab_cascade`, …) harus cocok dengan frontend. Katalog: `docs/MIGRATIONS.md`.
2. Seed ulang: signup user baru; org baru mendapat COA + Cash/Bank via trigger `seed_akunting_default`.
3. Baca ulang pitfalls di docs subsystem terkait (`025` → `AKUNTING.md`, `022` → `PERMISSIONS.md`, amend flows → `AMENDMENTS.md`, dst.).

## Batasan

- Tidak ada automated test suite di repo; verifikasi manual / smoke di atas.
- `send-whatsapp` / `send-reminder` membutuhkan secret eksternal dan tidak terhubung UI.
- File legacy typo `src/pages/KelargaPage.jsx` masih ada; route memakai `KeluargaPage.jsx`.
