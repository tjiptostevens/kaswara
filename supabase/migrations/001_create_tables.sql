-- 001_create_tables.sql
-- Kaswara — Kas Warga Indonesia
-- Initial schema: create all tables and views

create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────
-- organisasi
-- ─────────────────────────────────────────
create table if not exists organisasi (
  id         uuid primary key default uuid_generate_v4(),
  nama       text not null,
  tipe       text not null check (tipe in ('rt_rw', 'keluarga')),
  alamat     text,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- anggota_organisasi
-- ─────────────────────────────────────────
create table if not exists anggota_organisasi (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references auth.users(id) on delete cascade,
  organisasi_id   uuid references organisasi(id) on delete cascade,
  role            text not null check (role in ('bendahara', 'ketua', 'anggota')),
  nama_lengkap    text not null,
  nomor_anggota   text,
  aktif           boolean default true,
  unique(user_id, organisasi_id)
);

-- ─────────────────────────────────────────
-- kategori_transaksi
-- ─────────────────────────────────────────
create table if not exists kategori_transaksi (
  id            uuid primary key default uuid_generate_v4(),
  organisasi_id uuid references organisasi(id) on delete cascade,
  nama          text not null,
  tipe          text not null check (tipe in ('pemasukan', 'pengeluaran', 'keduanya'))
);

-- ─────────────────────────────────────────
-- rab (Rencana Anggaran Biaya)
-- ─────────────────────────────────────────
create table if not exists rab (
  id                  uuid primary key default uuid_generate_v4(),
  organisasi_id       uuid references organisasi(id) on delete cascade,
  nama_kegiatan       text not null,
  deskripsi           text,
  total_anggaran      numeric(15,2) not null default 0,
  status              text not null default 'draft'
                        check (status in ('draft', 'diajukan', 'disetujui', 'ditolak', 'selesai')),
  catatan_ketua       text,
  diajukan_oleh       uuid references auth.users(id),
  disetujui_oleh      uuid references auth.users(id),
  tanggal_pengajuan   date not null default current_date,
  tanggal_kegiatan    date not null,
  created_at          timestamptz default now()
);

-- ─────────────────────────────────────────
-- rab_item
-- ─────────────────────────────────────────
create table if not exists rab_item (
  id            uuid primary key default uuid_generate_v4(),
  rab_id        uuid references rab(id) on delete cascade,
  nama_item     text not null,
  volume        numeric(15,2) not null,
  satuan        text not null,
  harga_satuan  numeric(15,2) not null,
  subtotal      numeric(15,2) not null
);

-- ─────────────────────────────────────────
-- rap (Realisasi Anggaran Pengeluaran)
-- ─────────────────────────────────────────
create table if not exists rap (
  id                  uuid primary key default uuid_generate_v4(),
  rab_id              uuid references rab(id),
  organisasi_id       uuid references organisasi(id) on delete cascade,
  nama_item           text not null,
  jumlah_realisasi    numeric(15,2) not null check (jumlah_realisasi > 0),
  keterangan          text,
  tanggal_realisasi   date not null default current_date,
  dibuat_oleh         uuid references auth.users(id),
  created_at          timestamptz default now()
);

-- ─────────────────────────────────────────
-- rap_foto
-- ─────────────────────────────────────────
create table if not exists rap_foto (
  id            uuid primary key default uuid_generate_v4(),
  rap_id        uuid references rap(id) on delete cascade,
  storage_path  text not null,
  nama_file     text,
  uploaded_at   timestamptz default now()
);

-- ─────────────────────────────────────────
-- transaksi
-- ─────────────────────────────────────────
create table if not exists transaksi (
  id            uuid primary key default uuid_generate_v4(),
  organisasi_id uuid references organisasi(id) on delete cascade,
  kategori_id   uuid references kategori_transaksi(id),
  tipe          text not null check (tipe in ('pemasukan', 'pengeluaran')),
  jumlah        numeric(15,2) not null check (jumlah > 0),
  keterangan    text,
  tanggal       date not null default current_date,
  dibuat_oleh   uuid references auth.users(id),
  rap_id        uuid references rap(id),
  created_at    timestamptz default now()
);

-- ─────────────────────────────────────────
-- iuran_rutin
-- ─────────────────────────────────────────
create table if not exists iuran_rutin (
  id            uuid primary key default uuid_generate_v4(),
  organisasi_id uuid references organisasi(id) on delete cascade,
  anggota_id    uuid references anggota_organisasi(id) on delete cascade,
  periode       date not null,
  jumlah        numeric(15,2) not null check (jumlah > 0),
  status        text not null default 'belum_bayar'
                  check (status in ('belum_bayar', 'lunas', 'dispensasi')),
  tanggal_bayar date,
  transaksi_id  uuid references transaksi(id)
);

-- ─────────────────────────────────────────
-- saldo_organisasi view
-- ─────────────────────────────────────────
create or replace view saldo_organisasi as
  select
    organisasi_id,
    sum(case when tipe = 'pemasukan' then jumlah else -jumlah end) as saldo,
    sum(case when tipe = 'pemasukan' then jumlah else 0 end)       as total_pemasukan,
    sum(case when tipe = 'pengeluaran' then jumlah else 0 end)     as total_pengeluaran
  from transaksi
  group by organisasi_id;
