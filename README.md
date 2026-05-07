# Kaswara — Kas Warga Negara

<p align="center">
  <img src="https://img.shields.io/badge/React-19.x-61DAFB?logo=react" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4.2-38BDF8?logo=tailwindcss" />
  <img src="https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase" />
  <img src="https://img.shields.io/badge/Vite-Build_Tool-646CFF?logo=vite" />
  <img src="https://img.shields.io/badge/License-MIT-green" />
  <img src="https://img.shields.io/badge/Status-In_Development-yellow" />
</p>

<p align="center">
  <strong>Kaswara</strong> — Aplikasi open source pengelolaan keuangan kas RT, RW, dan keluarga.<br/>
  Transparan, mudah digunakan, dan dapat di-<em>deploy</em> secara gratis.
</p>

---

## Daftar Isi

- [Tentang Proyek](#tentang-proyek)
- [Perubahan Terbaru](#perubahan-terbaru)
- [Fitur](#fitur)
- [Tech Stack](#tech-stack)
- [Brand Guideline](#brand-guideline)
- [Arsitektur Sistem](#arsitektur-sistem)
- [Struktur Folder](#struktur-folder)
- [Skema Database](#skema-database)
- [Alur Aplikasi](#alur-aplikasi)
- [Instalasi & Setup](#instalasi--setup)
- [Konfigurasi Supabase](#konfigurasi-supabase)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Kontribusi](#kontribusi)
- [Lisensi](#lisensi)

---

## Tentang Proyek

**Kaswara** (_Kas Warga Negara_) adalah aplikasi web open source yang dirancang untuk membantu pengurus RT/RW dan keluarga mengelola keuangan kas secara digital, transparan, dan akuntabel.

Selama ini pengelolaan kas RT/RW masih sering dilakukan secara manual menggunakan buku tulis atau spreadsheet yang rawan hilang dan sulit dibagikan ke warga. Kaswara hadir sebagai solusi digital yang bisa diakses dari mana saja, gratis, dan mudah dikontribusikan oleh komunitas.

**Target pengguna:**

- Bendahara & Pengurus RT/RW
- Ketua RT/RW (untuk persetujuan RAB)
- Warga (untuk melihat laporan transparansi)
- Bendahara keluarga (mode keluarga)

---

## Perubahan Terbaru

Pembaruan yang sudah ditambahkan di aplikasi:

- [x] Halaman transparansi publik (`/publik` dan `/publik/:handle`) untuk akses laporan tanpa login.
- [x] Modul **Surat** (`/surat`) beserta alur persetujuan/status pengajuan.
- [x] Alur iuran yang lebih lengkap (workflow iuran + kategori iuran).
- [x] Integrasi RAP ke transaksi otomatis saat disetujui.
- [x] Dukungan upload bukti RAP ke Supabase Storage.
- [x] Penyempurnaan skema dan kebijakan RLS Supabase melalui migration berkelanjutan.

---

## Fitur

### Fitur Utama (v1.0)

| Fitur                                    | Deskripsi                                                   | Akses            |
| ---------------------------------------- | ----------------------------------------------------------- | ---------------- |
| **Dashboard Ringkasan**                  | Saldo terkini, total pemasukan/pengeluaran bulan ini        | Semua pengguna   |
| **Pemasukan & Pengeluaran**              | Input transaksi kas harian dengan kategori                  | Matriks izin     |
| **Manajemen Anggota**                    | Data warga/anggota + pengaturan matriks izin                | Bendahara/Ketua  |
| **Iuran Rutin**                          | Pencatatan iuran per periode (bulanan/tahunan) per anggota  | Matriks izin     |
| **RAB (Rencana Anggaran Biaya)**         | Pengajuan anggaran kegiatan, alur persetujuan Ketua         | Matriks izin     |
| **RAP (Realisasi Anggaran Pengeluaran)** | Pencatatan realisasi RAB + upload bukti foto struk/kwitansi | Matriks izin     |
| **Kategori Transaksi**                   | Pengelompokan transaksi (kebersihan, keamanan, sosial, dll) | Admin           |
| **Kategori Iuran**                       | Kategori iuran per jenis tagihan warga/anggota              | Admin           |
| **Multi-role**                           | Bendahara, Ketua, Anggota (scope none/own/all per aksi)     | Admin           |
| **Laporan PDF**                          | Export laporan bulanan/tahunan ke PDF                       | Bendahara       |
| **Mode Keluarga**                        | Toggle mode: RT/RW atau Keluarga                            | Admin           |
| **Transparansi Publik**                  | Halaman publik read-only laporan organisasi                 | Admin/Warga     |
| **Manajemen Surat**                      | Pengajuan surat warga + workflow persetujuan                | Pengurus        |

### Roadmap (v2.0)

- [ ] Notifikasi iuran via email (Resend / Nodemailer)
- [x] Grafik cashflow bulanan pada dashboard (6 bulan terakhir) ✓ — grafik tahunan (12 bulan + selektor tahun) masih pending
- [ ] WhatsApp gateway untuk pengingat iuran
- [x] Approval workflow digital RAB (diajukan → disetujui/ditolak/dibatalkan/amandemen) ✓ — notifikasi real-time via web notif masih pending
- [ ] Multi-RT (untuk kelurahan dengan menambahkan id RT)
- [x] Skema sambungan RAB/RAP → transaksi (FK `rap_id` pada tabel transaksi) ✓ — otomatisasi insert transaksi saat RAP disetujui masih pending
- [x] Supabase Storage untuk upload foto bukti RAP ✓
- [x] Tampilkan nama anggota pada transaksi (join `anggota_organisasi` via `dibuat_oleh_anggota_id`) ✓ — RAP & RAB detail masih tampilkan UUID
- [ ] Cetak laporan dengan filter range tanggal (organisasi & personal)
- [x] **Halaman transparansi publik** — URL read-only untuk warga tanpa login (`/publik/:handle`) ✓

### Roadmap (v3.0)

- [ ] **PWA (Progressive Web App)** — service worker, installable, offline read cache
- [ ] **Import massal CSV/Excel** — impor transaksi, anggota, dan iuran dari spreadsheet
- [ ] **Export Excel/CSV** — ekspor data selain PDF ke format spreadsheet
- [ ] **Laporan tahunan otomatis** — generate & kirim ringkasan akhir tahun via email (Supabase cron)
- [ ] **Manajemen aset komunitas** — inventaris barang RT/RW (meja, tenda, speaker, dll)
- [ ] **Integrasi pembayaran digital** — link iuran via QRIS / Midtrans / Xendit
- [ ] **Dark mode UI** — tema gelap via Tailwind `dark:` class
- [ ] **Audit log** — tabel `riwayat_perubahan` untuk mencatat semua operasi CRUD
- [ ] **Iuran fleksibel per golongan** — nominal iuran berbeda per anggota atau golongan warga
- [ ] **2FA / OTP login** — lapisan keamanan tambahan via TOTP atau OTP SMS/email
- [ ] **Core Tax (Pajak & Retribusi)** — modul inti perpajakan: tracking tagihan PBB (Pajak Bumi dan Bangunan) per warga, retribusi kebersihan/keamanan, kalkulasi otomatis iuran pajak berdasarkan luas tanah/bangunan, laporan realisasi setoran PBB ke kelurahan, dan notifikasi jatuh tempo pajak

---

## Tech Stack

| Layer                | Teknologi             | Keterangan                        |
| -------------------- | --------------------- | --------------------------------- | ----------------------------- |
| **Frontend**         | React 19 + Vite       | SPA, fast refresh                 |
| **Styling**          | Tailwind CSS v4.2     | Utility-first CSS                 | vanila css for custom styling |
| **State Management** | Zustand               | Lightweight, no boilerplate       |
| **Routing**          | React Router v7       | Client-side routing               |
| **Form**             | React Hook Form + Zod | Validasi form & schema            |
| **Database**         | Supabase (PostgreSQL) | Relasional, gratis s.d. 500MB     |
| **Auth**             | Supabase Auth         | Email/password + Magic Link       |
| **Storage**          | Supabase Storage      | Upload foto bukti (max 50MB/file) |
| **Realtime**         | Supabase Realtime     | Saldo update otomatis             |
| **PDF Export**       | jsPDF + html2canvas   | Generate laporan PDF di browser   |
| **Hosting**          | Vercel / Netlify      | Deploy dari GitHub, gratis        |
| **Icons**            | Lucide React          | Konsisten, tree-shakeable         |

---

## Brand Guideline

Panduan identitas visual Kaswara untuk penggunaan yang konsisten di semua platform dan kontribusi.

### Nama & Makna

|                    |                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Nama**           | Kaswara                                                                                                                               |
| **Kepanjangan**    | Kas Warga Negara                                                                                                                      |
| **Makna tambahan** | Dalam kosakata Sansekerta/Jawa, _wara_ berarti _kabar baik_ — Kaswara secara tidak langsung bermakna _"kabar baik tentang kas warga"_ |
| **Tagline**        | _Kas Warga Negara_                                                                                                                    |
| **Penulisan**      | Selalu ditulis **Kaswara** (kapital di awal), bukan KASWARA atau kaswara                                                              |

---

### Logo

#### Logomark (Ikon)

Logomark Kaswara terdiri dari empat kotak persegi dalam susunan 2×2, terinspirasi dari ide **transparansi dan keterbukaan** pengelolaan kas komunitas. Kotak kiri-atas berwarna Amber Gold melambangkan uang/kas, sedangkan tiga kotak lainnya berwarna putih semi-transparan melambangkan warga yang beragam namun bersatu dalam satu sistem.

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   ┌──────────────────┐    kaswara                          │
│   │   [■ Gold] [  ]  │    ─────────────────────────        │
│   │   [  ]    [  ]   │    Kas Warga Negara              │
│   └──────────────────┘                                     │
│    Logomark              Wordmark + Tagline                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Variasi Logo

| Variasi                    | Penggunaan                                  |
| -------------------------- | ------------------------------------------- |
| **Horizontal (default)**   | Header aplikasi, README, dokumentasi        |
| **Stacked (ikon di atas)** | Splash screen, kartu nama, print            |
| **Ikon saja**              | Favicon, app icon mobile, avatar GitHub org |
| **Reversed (bg gelap)**    | Footer gelap, banner hero gelap             |

#### Zona Aman (Clear Space)

Selalu berikan ruang kosong minimal setara dengan tinggi huruf kapital "K" di semua sisi logo. Jangan meletakkan elemen lain di dalam zona ini.

#### Yang Tidak Boleh Dilakukan

- Mengubah warna logo di luar variasi yang sudah ditentukan
- Meregangkan atau memampatkan proporsi logo
- Menambahkan efek bayangan, outline, atau glow
- Meletakkan logo di atas background yang terlalu ramai
- Menggunakan font lain untuk wordmark

---

### Warna

#### Palet Utama

| Nama             | HEX       | Penggunaan                                         |
| ---------------- | --------- | -------------------------------------------------- |
| **Forest Green** | `#1a6b5a` | Warna brand utama, tombol primary, highlight, link |
| **Deep Forest**  | `#0f3d32` | Heading, teks pada background terang, dark mode bg |
| **Mint Surface** | `#e8f5f1` | Background ringan, card tint, hover state          |

#### Palet Aksen

| Nama           | HEX       | Penggunaan                                          |
| -------------- | --------- | --------------------------------------------------- |
| **Amber Gold** | `#e8a020` | Aksen, tombol CTA penting, ikon kas, kotak logomark |
| **Gold Tint**  | `#faeeda` | Background badge gold, hover accent surface         |

#### Palet Semantik

| Nama             | HEX       | Penggunaan                                    |
| ---------------- | --------- | --------------------------------------------- |
| **Danger Red**   | `#e24b4a` | Error, hapus, pengeluaran, status belum bayar |
| **Success Teal** | `#1D9E75` | Sukses, lunas, data tersimpan                 |
| **Info Blue**    | `#185FA5` | Informasi, status disetujui, tautan           |

#### Palet Netral

| Nama             | HEX       | Penggunaan                           |
| ---------------- | --------- | ------------------------------------ |
| **Warm White**   | `#f8f7f3` | Background halaman utama             |
| **Charcoal**     | `#3d3d3a` | Body text utama                      |
| **Stone Gray**   | `#9b9b95` | Teks muted, label input, placeholder |
| **Border Light** | `#e5e4de` | Garis border, divider                |

#### Aturan Penggunaan Warna

- Gunakan **Forest Green** sebagai warna dominan, Amber Gold sebagai aksen — bukan sebaliknya
- Pastikan rasio kontras teks minimum **4.5:1** (WCAG AA) untuk aksesibilitas
- Teks di atas **Forest Green** gunakan warna putih `#ffffff`
- Teks di atas **Amber Gold** gunakan **Deep Forest** `#0f3d32`
- Jangan gunakan merah untuk elemen selain error/pengeluaran

---

### Tipografi

#### Font Utama — Plus Jakarta Sans

Font display dan UI utama Kaswara. Memberikan kesan modern, ramah, dan terpercaya.

```
Google Fonts: https://fonts.google.com/specimen/Plus+Jakarta+Sans
Fallback: system-ui, -apple-system, sans-serif
```

| Style      | Weight | Size    | Penggunaan               |
| ---------- | ------ | ------- | ------------------------ |
| Display    | 700    | 28–36px | Judul halaman, hero text |
| Heading H1 | 700    | 24px    | Judul section utama      |
| Heading H2 | 600    | 20px    | Subjudul section         |
| Subheading | 500    | 15–16px | Label, caption penting   |
| Body UI    | 400    | 14–15px | Konten umum antarmuka    |
| Label      | 500    | 11–12px | Badge, tag, input label  |

#### Font Sekunder — Lora

Digunakan untuk teks editorial panjang: deskripsi laporan, keterangan transaksi, onboarding. Memberikan karakter yang hangat.

```
Google Fonts: https://fonts.google.com/specimen/Lora
Fallback: Georgia, serif
```

| Style    | Weight | Penggunaan                           |
| -------- | ------ | ------------------------------------ |
| Regular  | 400    | Body panjang, deskripsi paragraph    |
| Italic   | 400i   | Kutipan, penekanan ringan            |
| SemiBold | 600    | Pull quote, highlight teks editorial |

#### Font Monospace

Untuk menampilkan angka nominal uang, kode referensi transaksi, dan blok kode di dokumentasi.

```
Pilihan: JetBrains Mono, Fira Code, atau system monospace
Fallback: 'Courier New', monospace
```

#### Implementasi di Tailwind CSS v3

```js
// tailwind.config.js
theme: {
  extend: {
    fontFamily: {
      display: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      body:    ['Lora', 'Georgia', 'serif'],
      mono:    ['JetBrains Mono', 'Fira Code', 'monospace'],
    },
    colors: {
      brand:  { DEFAULT: '#1a6b5a', dark: '#0f3d32', light: '#e8f5f1' },
      accent: { DEFAULT: '#e8a020', light: '#faeeda' },
    },
  },
},
```

```css
/* src/index.css */
@import url("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Lora:ital,wght@0,400;0,600;1,400&display=swap");

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --color-brand: #1a6b5a;
    --color-brand-dark: #0f3d32;
    --color-brand-light: #e8f5f1;
    --color-accent: #e8a020;
    --color-accent-light: #faeeda;
  }

  html {
    font-family: "Plus Jakarta Sans", system-ui, sans-serif;
    color: #3d3d3a;
    background-color: #f8f7f3;
  }
}
```

---

### Ikonografi

Kaswara menggunakan **Lucide React** sebagai library ikon utama dengan stroke weight **1.5px** (default).

#### Ikon Utama Aplikasi

| Konteks             | Ikon Lucide       |
| ------------------- | ----------------- |
| Dashboard / Beranda | `LayoutDashboard` |
| Pemasukan           | `TrendingUp`      |
| Pengeluaran         | `TrendingDown`    |
| Transaksi           | `ArrowLeftRight`  |
| Anggota / Warga     | `Users`           |
| Iuran               | `Wallet`          |
| RAB (Pengajuan)     | `FileText`        |
| RAP (Realisasi)     | `Receipt`         |
| Foto / Bukti        | `Camera`          |
| Laporan             | `BarChart2`       |
| Pengaturan          | `Settings2`       |
| Notifikasi          | `Bell`            |
| Logout              | `LogOut`          |

#### Ukuran Ikon

| Konteks                 | Ukuran  |
| ----------------------- | ------- |
| Dalam tombol            | 16px    |
| Label navigasi sidebar  | 18px    |
| Kartu dashboard         | 20px    |
| Hero / ilustrasi kosong | 32–48px |

---

### Komponen UI

#### Tombol (Button)

```
Primary   → bg: #1a6b5a  | text: white    | radius: 8px | padding: 8px 16px
Secondary → bg: transparan | text: #1a6b5a | border: 1.5px solid #1a6b5a
Accent    → bg: #e8a020  | text: #0f3d32 | radius: 8px | font-weight: 600
Ghost     → bg: transparan | text: #3d3d3a | border: 0.5px solid #e5e4de
Danger    → bg: #e24b4a  | text: white   | radius: 8px
```

#### Badge & Status

```
Lunas        → bg: #E1F5EE  | text: #0F6E56   (teal)
Belum bayar  → bg: #FCEBEB  | text: #A32D2D   (merah)
Diajukan     → bg: #FAEEDA  | text: #854F0B   (amber/gold)
Disetujui    → bg: #E6F1FB  | text: #185FA5   (biru)
Ditolak      → bg: #FCEBEB  | text: #A32D2D   (merah)
Draft        → bg: #F1EFE8  | text: #5F5E5A   (abu)
```

#### Kartu (Card)

```
Default card → bg: white     | border: 0.5px solid #e5e4de | radius: 12px | padding: 16px 20px
Surface card → bg: #f8f7f3   | no border | radius: 8px | padding: 16px
Accent card  → bg: white     | border-top: 2px solid #e8a020 | radius: 12px
Metric card  → bg: #e8f5f1   | no border | radius: 8px | padding: 16px
```

#### Spacing Scale

```
4px  — xs   : celah antar ikon dan teks, gap dalam badge
8px  — sm   : padding internal elemen kecil, gap antar badge
12px — md   : gap dalam grid kecil, padding badge
16px — base : padding card, gap antar elemen dalam form
24px — lg   : gap antar section dalam card
40px — xl   : padding halaman, jarak antar section besar
64px — 2xl  : jarak antar blok konten besar (hero, CTA)
```

#### Border Radius

```
4px  — badge, tag kecil, chip
8px  — input, button, dropdown
12px — card, panel, popover
16px — modal, drawer, sheet besar
99px — pill (badge status)
```

---

### Tone of Voice

Kaswara berbicara dengan nada yang **hangat, langsung, dan jelas** — seperti seorang bendahara RT yang terpercaya dan mudah didekati.

#### Gunakan

- Kalimat aktif: _"Simpan transaksi"_ bukan _"Transaksi akan disimpan"_
- Bahasa familiar warga: _"iuran"_, _"kas"_, _"warga"_, _"pengurus"_
- Konfirmasi yang menenangkan: _"Berhasil disimpan!"_
- Pesan error yang membantu: _"Nominal tidak boleh kosong"_
- Bahasa Indonesia yang baik, bukan campur-campur

#### Hindari

- Jargon akuntansi atau keuangan yang rumit
- Bahasa terlalu formal atau birokratis
- Pesan error teknis yang menakutkan
- Kalimat panjang dan berbelit
- Istilah Inggris yang ada padanan Indonesianya

#### Contoh Penulisan UI

| Konteks          | Hindari                     | Gunakan                          |
| ---------------- | --------------------------- | -------------------------------- |
| Tombol simpan    | Save Transaction            | Simpan transaksi                 |
| Pesan sukses     | Record created successfully | Data berhasil disimpan           |
| Pesan error      | Field validation failed     | Mohon isi semua kolom yang wajib |
| Label status     | Paid                        | Lunas                            |
| Konfirmasi hapus | Are you sure?               | Yakin ingin menghapus data ini?  |
| Empty state      | No data found               | Belum ada transaksi bulan ini    |
| Loading          | Loading...                  | Memuat data...                   |

---

### Penggunaan Aset Brand

#### Diizinkan

- Menggunakan nama "Kaswara" dan logo dalam kontribusi open source, dokumentasi, dan fork proyek
- Menampilkan badge "Powered by Kaswara" pada deployment komunitas
- Memodifikasi warna untuk kebutuhan aksesibilitas (dengan tetap mempertahankan karakter brand)

#### Tidak Diizinkan

- Menggunakan nama "Kaswara" untuk produk komersial berbeda tanpa izin
- Memodifikasi logo dan mengklaimnya sebagai logo asli Kaswara
- Menggunakan brand Kaswara untuk hal yang menyesatkan atau merugikan komunitas

---

## Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                      │
│                                                              │
│   React App (Vite)                                           │
│   ┌──────────────┐  ┌────────────┐  ┌────────────────────┐  │
│   │    Pages     │  │ Components │  │   Zustand Stores   │  │
│   │  Dashboard   │  │  Forms     │  │  authStore         │  │
│   │  Transaksi   │  │  Tables    │  │  kasStore          │  │
│   │  RAB / RAP   │  │  Charts    │  │  anggotaStore      │  │
│   │  Anggota     │  │  Modals    │  │  uiStore           │  │
│   │  Laporan     │  └────────────┘  └────────────────────┘  │
│   └──────┬───────┘                                           │
│          │  Supabase JS Client (@supabase/supabase-js)       │
└──────────┼──────────────────────────────────────────────────┘
           │ HTTPS / WebSocket
┌──────────┼──────────────────────────────────────────────────┐
│          │            SUPABASE (Backend as a Service)        │
│   ┌──────▼────────────────────────────────────────────┐     │
│   │                  API Gateway (PostgREST)            │     │
│   └──────┬──────────────────┬────────────────┬─────────┘     │
│          │                  │                │               │
│   ┌──────▼──────┐  ┌────────▼──────┐  ┌─────▼────────┐     │
│   │  PostgreSQL  │  │  Auth (GoTrue)│  │   Storage    │     │
│   │  Database    │  │  JWT Tokens   │  │  (Foto RAP)  │     │
│   │              │  │  RLS Policies │  │              │     │
│   └──────┬───────┘  └───────────────┘  └──────────────┘     │
│          │                                                   │
│   ┌──────▼──────────────────────┐                           │
│   │       Row Level Security    │                           │
│   │  (Setiap RT hanya lihat     │                           │
│   │   data RT sendiri)          │                           │
│   └─────────────────────────────┘                           │
└─────────────────────────────────────────────────────────────┘
           │
┌──────────▼──────────────┐
│     Vercel / Netlify     │
│  (Static Hosting + CDN)  │
│  Auto-deploy dari GitHub │
└──────────────────────────┘
```

### Alur Autentikasi & Role

```
Pengguna Login (Supabase Auth)
         │
         ▼
    JWT Token diterima
         │
         ▼
    RLS Policy aktif → User hanya bisa akses data organisasi sendiri
         │
         ├──► role = 'bendahara/ketua' → default full permission matrix
         └──► role = 'anggota'         → default matrix terbatas (dapat dikustom)
                    │
                    ▼
      Matrix `anggota_permission` menentukan aksi per resource:
      - Resource: transaksi, iuran, rab, rap, surat
      - Aksi: create/read/update/delete/submit/approve/cancel
      - Scope: none | own | all
```

---

## Struktur Folder

```
kaswara/
├── public/
│   ├── favicon.ico
│   └── og-image.png
│
├── src/
│   ├── assets/                    # Gambar, logo, icon statis
│   │
│   ├── components/                # Komponen UI yang dapat digunakan ulang
│   │   ├── ui/                    # Komponen dasar (Button, Input, Modal, Badge)
│   │   │   ├── Button.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Badge.jsx
│   │   │   ├── Table.jsx
│   │   │   └── index.js
│   │   ├── layout/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Header.jsx
│   │   │   ├── PageWrapper.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── dashboard/
│   │   │   ├── SaldoCard.jsx
│   │   │   ├── StatGrid.jsx
│   │   │   ├── TransaksiRecent.jsx
│   │   │   ├── CashflowChart.jsx
│   │   │   └── KategoriBreakdown.jsx
│   │   ├── transaksi/
│   │   │   ├── FormTransaksi.jsx
│   │   │   ├── TransaksiTable.jsx
│   │   │   └── FilterTransaksi.jsx
│   │   ├── anggota/
│   │   │   ├── FormAnggota.jsx
│   │   │   ├── AnggotaTable.jsx
│   │   │   └── StatusIuranBadge.jsx
│   │   ├── rab/
│   │   │   ├── FormRAB.jsx
│   │   │   ├── RABTable.jsx
│   │   │   ├── RABStatusFlow.jsx
│   │   │   └── ApprovalButtons.jsx
│   │   ├── rap/
│   │   │   ├── FormRAP.jsx
│   │   │   ├── RAPTable.jsx
│   │   │   └── FotoBuktiViewer.jsx
│   │   └── kategori/
│   │       └── FormKategori.jsx
│   │
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── LoginPage.jsx
│   │   │   └── SetupOrganisasiPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── TransaksiPage.jsx
│   │   ├── AnggotaPage.jsx
│   │   ├── IuranPage.jsx
│   │   ├── KelargaPage.jsx
│   │   ├── RABPage.jsx
│   │   ├── RAPPage.jsx
│   │   ├── LaporanPage.jsx
│   │   ├── KategoriPage.jsx
│   │   └── SettingsPage.jsx
│   │
│   ├── stores/
│   │   ├── authStore.js
│   │   ├── kasStore.js
│   │   ├── anggotaStore.js
│   │   └── uiStore.js
│   │
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useTransaksi.js
│   │   ├── useAnggota.js
│   │   ├── useRAB.js
│   │   └── useSupabaseRealtime.js
│   │
│   ├── lib/
│   │   ├── supabase.js
│   │   ├── pdfExport.js
│   │   └── formatters.js
│   │
│   ├── schemas/
│   │   ├── transaksiSchema.js
│   │   ├── anggotaSchema.js
│   │   ├── rabSchema.js
│   │   └── rapSchema.js
│   │
│   ├── constants/
│   │   ├── roles.js
│   │   ├── kategori.js
│   │   └── routes.js
│   │
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
│
├── supabase/
│   ├── migrations/
│   │   ├── 001_create_tables.sql
│   │   ├── 002_rls_policies.sql
│   │   ├── 003_seed_kategori.sql
│   │   ├── 004_fix_organisasi_rls.sql
│   │   ├── 005_add_email_hp_to_anggota.sql
│   │   ├── 006_ketua_manage_anggota.sql
│   │   ├── 007_create_anggota_keluarga.sql
│   │   ├── 008_personal_workspace.sql
│   │   ├── 009_personal_rls.sql
│   │   └── 010_can_manage_rab_and_transaksi_creator.sql
│   └── functions/
│       └── send-reminder/
│
├── .env.example
├── .gitignore
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

---

## Skema Database

### Entity Relationship Diagram

```
organisasi
  ├── id (uuid, PK)
  ├── nama
  ├── tipe ('rt_rw' | 'keluarga')
  ├── alamat
  └── created_at

anggota_organisasi
  ├── id (uuid, PK)
  ├── user_id (FK → auth.users)
  ├── organisasi_id (FK → organisasi)
  ├── role ('bendahara' | 'ketua' | 'anggota')
  ├── nama_lengkap
  ├── nomor_anggota
  └── aktif (boolean)

kategori_transaksi
  ├── id (uuid, PK)
  ├── organisasi_id (FK)
  ├── nama
  └── tipe ('pemasukan' | 'pengeluaran' | 'keduanya')

transaksi
  ├── id (uuid, PK)
  ├── organisasi_id (FK)
  ├── kategori_id (FK → kategori_transaksi)
  ├── tipe ('pemasukan' | 'pengeluaran')
  ├── jumlah (numeric)
  ├── keterangan
  ├── tanggal (date)
  ├── dibuat_oleh (FK → auth.users)
  ├── rap_id (FK → rap, nullable)
  └── created_at

iuran_rutin
  ├── id (uuid, PK)
  ├── organisasi_id (FK)
  ├── anggota_id (FK → anggota_organisasi)
  ├── periode (date)
  ├── jumlah (numeric)
  ├── status ('belum_bayar' | 'lunas' | 'dispensasi')
  ├── tanggal_bayar (date, nullable)
  └── transaksi_id (FK → transaksi, nullable)

rab
  ├── id (uuid, PK)
  ├── organisasi_id (FK)
  ├── nama_kegiatan
  ├── deskripsi
  ├── total_anggaran (numeric)
  ├── status ('draft' | 'diajukan' | 'disetujui' | 'ditolak' | 'selesai')
  ├── catatan_ketua (nullable)
  ├── diajukan_oleh (FK → auth.users)
  ├── disetujui_oleh (FK → auth.users, nullable)
  ├── tanggal_pengajuan (date)
  ├── tanggal_kegiatan (date)
  └── created_at

rab_item
  ├── id (uuid, PK)
  ├── rab_id (FK → rab)
  ├── nama_item
  ├── volume (numeric)
  ├── satuan
  ├── harga_satuan (numeric)
  └── subtotal (numeric)

rap
  ├── id (uuid, PK)
  ├── rab_id (FK → rab)
  ├── organisasi_id (FK)
  ├── nama_item
  ├── jumlah_realisasi (numeric)
  ├── keterangan
  ├── tanggal_realisasi (date)
  ├── dibuat_oleh (FK → auth.users)
  └── created_at

rap_foto
  ├── id (uuid, PK)
  ├── rap_id (FK → rap)
  ├── storage_path (text)
  ├── nama_file
  └── uploaded_at
```

### SQL Migration Utama

```sql
-- 001_create_tables.sql

create extension if not exists "uuid-ossp";

create table organisasi (
  id uuid primary key default uuid_generate_v4(),
  nama text not null,
  tipe text not null check (tipe in ('rt_rw', 'keluarga')),
  alamat text,
  created_at timestamptz default now()
);

create table anggota_organisasi (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  organisasi_id uuid references organisasi(id) on delete cascade,
  role text not null check (role in ('bendahara', 'ketua', 'anggota')),
  nama_lengkap text not null,
  nomor_anggota text,
  aktif boolean default true,
  unique(user_id, organisasi_id)
);

create table transaksi (
  id uuid primary key default uuid_generate_v4(),
  organisasi_id uuid references organisasi(id) on delete cascade,
  kategori_id uuid references kategori_transaksi(id),
  tipe text not null check (tipe in ('pemasukan', 'pengeluaran')),
  jumlah numeric(15,2) not null check (jumlah > 0),
  keterangan text,
  tanggal date not null default current_date,
  dibuat_oleh uuid references auth.users(id),
  rap_id uuid references rap(id),
  created_at timestamptz default now()
);

-- View saldo otomatis
create view saldo_organisasi as
  select
    organisasi_id,
    sum(case when tipe = 'pemasukan' then jumlah else -jumlah end) as saldo,
    sum(case when tipe = 'pemasukan' then jumlah else 0 end) as total_pemasukan,
    sum(case when tipe = 'pengeluaran' then jumlah else 0 end) as total_pengeluaran
  from transaksi
  group by organisasi_id;
```

```sql
-- 002_rls_policies.sql

alter table organisasi enable row level security;
alter table transaksi enable row level security;
alter table rab enable row level security;

create or replace function is_member(org_id uuid)
returns boolean as $$
  select exists (
    select 1 from anggota_organisasi
    where user_id = auth.uid()
    and organisasi_id = org_id
    and aktif = true
  );
$$ language sql security definer;

create or replace function get_role(org_id uuid)
returns text as $$
  select role from anggota_organisasi
  where user_id = auth.uid()
  and organisasi_id = org_id
$$ language sql security definer;

create policy "anggota_bisa_lihat_transaksi"
  on transaksi for select
  using (is_member(organisasi_id));

create policy "bendahara_kelola_transaksi"
  on transaksi for all
  using (get_role(organisasi_id) = 'bendahara');
```

---

## Alur Aplikasi

### Alur RAB → RAP

```
Bendahara buat RAB (draft)
         │
         ▼
Bendahara submit RAB → status: 'diajukan'
         │
         ▼
Ketua review RAB
    ├── Setuju  → status: 'disetujui' → Bendahara bisa buat RAP
    └── Tolak   → status: 'ditolak'  → ada catatan penolakan
         │
         ▼ (jika disetujui)
Bendahara buat RAP per item + upload foto bukti
         │
         ▼
Otomatis tercatat sebagai Transaksi Pengeluaran
         │
         ▼
RAB status → 'selesai' (jika semua item terealisasi)
```

### Alur Iuran

```
Setup iuran rutin (nominal & periode)
         │
         ▼
Generate record iuran per anggota per bulan
         │
         ▼
Bendahara catat pembayaran → status: 'lunas'
         │
         ▼
Otomatis tercatat sebagai Transaksi Pemasukan
```

---

## Instalasi & Setup

### Prasyarat

- Node.js >= 18
- npm atau pnpm
- Akun [Supabase](https://supabase.com) (gratis)
- Akun [Vercel](https://vercel.com) atau [Netlify](https://netlify.com) (gratis)

### 1. Clone Repository

```bash
git clone https://github.com/username/kaswara.git
cd kaswara
```

### 2. Install Dependensi

```bash
npm install
# atau
pnpm install
```

### 3. Setup Environment Variables

```bash
cp .env.example .env.local
```

### 4. Jalankan Migration Database

Masuk ke Supabase Dashboard → SQL Editor, jalankan berurutan:

```
supabase/migrations/001_create_tables.sql
supabase/migrations/002_rls_policies.sql
supabase/migrations/003_seed_kategori.sql
supabase/migrations/004_fix_organisasi_rls.sql
supabase/migrations/005_add_email_hp_to_anggota.sql
supabase/migrations/006_ketua_manage_anggota.sql
supabase/migrations/007_create_anggota_keluarga.sql
supabase/migrations/008_personal_workspace.sql
supabase/migrations/009_personal_rls.sql
supabase/migrations/010_can_manage_rab_and_transaksi_creator.sql
```

Atau dengan Supabase CLI:

```bash
npx supabase db push
```

### 5. Setup Storage Bucket

Supabase Dashboard → Storage → Create Bucket:

- Nama: `rap-foto`
- Public: **Tidak**
- File size limit: `10MB`
- Allowed MIME types: `image/jpeg, image/png, image/webp`

### 6. Jalankan Development Server

```bash
npm run dev
```

Buka [http://localhost:5173](http://localhost:5173)

---

## Konfigurasi Supabase

### Mendapatkan Kredensial

1. Buka [supabase.com](https://supabase.com) → Buat proyek baru
2. Masuk ke **Settings → API**
3. Salin **Project URL** dan **anon public key**

### Inisialisasi Supabase Client

```javascript
// src/lib/supabase.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

---

## Environment Variables

```env
# .env.local (jangan di-commit ke Git)
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_APP_NAME=Kaswara
```

```env
# .env.example (aman untuk di-commit)
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_APP_NAME=Kaswara
```

---

## Deployment

### Deploy ke Vercel (Rekomendasi)

1. Push repository ke GitHub
2. Buka [vercel.com](https://vercel.com) → Import Project dari GitHub
3. Tambahkan environment variables di Vercel dashboard
4. Klik **Deploy**

Vercel otomatis build dan deploy setiap push ke branch `main`.

### Deploy ke Netlify

1. Push repository ke GitHub
2. Buka [netlify.com](https://netlify.com) → Add new site → Import from Git
3. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Tambahkan environment variables → Deploy

### Build Manual

```bash
npm run build
# Output tersedia di folder /dist
```

---

## Kontribusi

Kontribusi sangat disambut! Kaswara adalah proyek open source untuk komunitas Indonesia.

### Cara Berkontribusi

1. Fork repository ini
2. Buat branch fitur: `git checkout -b fitur/nama-fitur`
3. Commit: `git commit -m 'feat: tambah fitur X'`
4. Push: `git push origin fitur/nama-fitur`
5. Buat Pull Request

### Konvensi Commit

Gunakan format [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: tambah fitur export PDF laporan bulanan
fix: perbaiki kalkulasi saldo yang tidak sinkron
docs: update README dengan instruksi deployment
refactor: pisahkan komponen FormRAB menjadi lebih kecil
style: sesuaikan warna badge dengan brand guideline Kaswara
```

### Prioritas Kontribusi

- Bug fixes selalu diprioritaskan
- Perbaikan dokumentasi & panduan bahasa Indonesia
- Translasi ke Bahasa Inggris
- Unit test & integration test
- Peningkatan UI/UX sesuai brand guideline

---

## Lisensi

Proyek ini menggunakan lisensi **MIT** — bebas digunakan, dimodifikasi, dan didistribusikan untuk keperluan apapun termasuk komersial, selama menyertakan atribusi.

Lihat file [LICENSE](./LICENSE) untuk detail lengkap.

---

<p align="center">
  Dibangun dengan ❤️ untuk komunitas RT/RW Indonesia.
  <br/><br/>
  <strong>Kaswara</strong> — <em>Kas Warga Negara</em>
  <br/><br/>
  <a href="https://github.com/username/kaswara/issues">Laporkan Bug</a> ·
  <a href="https://github.com/username/kaswara/discussions">Diskusi</a> ·
  <a href="https://github.com/username/kaswara/pulls">Kontribusi</a>
</p>
