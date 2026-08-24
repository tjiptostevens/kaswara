# Edge Functions — Panduan Engineering

Katalog fungsi di `supabase/functions/`. Lokal: dilayani otomatis oleh container `supabase_edge_runtime` dari `npx supabase start` (lihat `AGENTS.md`).

## Ringkasan

| Function | Status UI | Secrets tambahan | Caller frontend |
|----------|-----------|------------------|-----------------|
| `create-anggota-with-auth` | **Live** (invite anggota) | `SITE_URL` (opsional) | `anggotaStore.addAnggota` |
| `send-reminder` | Tidak terhubung UI | `RESEND_API_KEY` | — |
| `send-whatsapp` | Tidak terhubung UI | `WA_API_TOKEN` | — |

Semua fungsi memakai triad otomatis Supabase: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`.

## Auth pola umum

1. Client kirim `Authorization: Bearer <user JWT>`.
2. Fungsi buat client anon + header JWT → `auth.getUser()`.
3. Tanpa user → `401`.
4. Operasi admin memakai service-role client (tidak pernah dikirim ke browser).
5. Cek role pemanggil di `anggota_organisasi` (biasanya `bendahara` \| `ketua`).

---

## `create-anggota-with-auth`

**Intent:** undangan anggota baru (atau attach user Kaswara yang sudah ada) + insert `anggota_organisasi`, opsional seed `anggota_permission`.

**Body (JSON):**

| Field | Wajib | Keterangan |
|-------|-------|------------|
| `email`, `nama_lengkap`, `role`, `organisasi_id` | ya | |
| `nomor_anggota`, `no_hp`, `aktif` | tidak | `aktif` default `true` |
| `can_manage_rab`, `can_manage_rap`, `can_approve_rab`, `can_approve_join_request` | tidak | flag legacy |
| `permissions` | tidak | nested matrix `{ resource: { action: scope } }` |

**Alur:**

1. Verifikasi pemanggil bendahara/ketua di org.
2. Cari user auth by email (admin API `search`).
3. Jika sudah anggota org yang sama → `400`.
4. Jika user sudah ada di Kaswara → attach tanpa invite (`existing_user: true`).
5. Jika belum → `auth.admin.generateLink({ type: 'invite' })` dengan `redirectTo: ${SITE_URL}/login` (fallback `SITE_URL` = `SUPABASE_URL`).
6. Insert `anggota_organisasi`; jika `permissions` ada, upsert baris `anggota_permission`.

**Frontend:** `src/stores/anggotaStore.js` → `supabase.functions.invoke('create-anggota-with-auth', { body })`.  
Ada duplikat mati di `src/lib/api.js` (tidak di-import halaman aktif).

**Local secret:**

```bash
npx supabase secrets set SITE_URL=http://localhost:5173
```

(Di hosted Supabase: Project Settings → Edge Functions → Secrets.)

---

## `send-reminder`

**Intent:** email pengingat iuran via [Resend](https://resend.com) untuk periode bulan berjalan.

**Body:** `{ organisasi_id, anggota_ids? }`

**Alur:** auth + role check → query `iuran_rutin` → kirim HTML email ke `anggota_organisasi.email`.

### Known issue (schema drift)

Fungsi memfilter `status = 'belum_bayar'`, tetapi migration `014_iuran_workflow.sql` mengganti status menjadi `draft | diajukan | cancelled | amended` (backfill: `belum_bayar`/`dispensasi` → `draft`, `lunas` → `diajukan`).

Akibatnya: jika dipanggil terhadap data pasca-014, query hampir selalu kosong (`sent: 0`). Perlu update filter (mis. target yang masih `draft` untuk periode berjalan) sebelum di-wire ke UI.

**Secret:** `RESEND_API_KEY`

---

## `send-whatsapp`

**Intent:** kirim satu pesan WhatsApp via [Fonnte](https://fonnte.com).

**Body:** `{ no_hp, pesan, organisasi_id }` (semua wajib)

**Alur:** auth + role check → normalisasi nomor (`0…` → `62…`) → `POST` Fonnte dengan `WA_API_TOKEN`.

Tidak ada caller di `src/` saat ini.

**Secret:** `WA_API_TOKEN`

---

## Deploy & uji lokal

```bash
# Stack lokal sudah menjalankan functions dari folder supabase/functions
sudo -E env "PATH=$PATH" npx supabase start

# Set secret (hosted atau CLI sesuai environment)
npx supabase secrets set RESEND_API_KEY=re_xxx
npx supabase secrets set WA_API_TOKEN=xxx
npx supabase secrets set SITE_URL=http://localhost:5173
```

Uji invite: sign up sebagai bendahara → Anggota → tambah email baru → cek Mailpit lokal (`http://127.0.0.1:54324`) untuk email invite (jika Auth email ter-route ke Mailpit).

## Pitfalls

1. **`SITE_URL` salah** — link invite mengarah ke host yang tidak menjalankan SPA.
2. **Service role bocor** — jangan pernah expose ke Vite env; hanya di edge runtime.
3. **CORS** — fungsi mengizinkan `Access-Control-Allow-Origin: *` + header auth standar Supabase client.
4. **Reminder status** — jangan anggap `send-reminder` production-ready sampai filter status diselaraskan dengan `014`.
5. **Duplikat API helper** — pakai `anggotaStore`, bukan `src/lib/api.js`, agar state matrix ikut ter-update.
