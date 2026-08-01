-- 025_akunting_sederhana.sql
-- Kaswara — Fondasi akunting sederhana (Simple + Advance)
-- Double-entry di balik layar; Simple mode menampilkan "uang di mana"

-- ─────────────────────────────────────────
-- pengaturan_user (preferensi tampilan per user per org)
-- ─────────────────────────────────────────
create table if not exists pengaturan_user (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  organisasi_id   uuid not null references organisasi(id) on delete cascade,
  mode_akunting   text not null default 'simple'
                    check (mode_akunting in ('simple', 'advance')),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique (user_id, organisasi_id)
);

-- ─────────────────────────────────────────
-- pengaturan_akunting (per organisasi)
-- ─────────────────────────────────────────
create table if not exists pengaturan_akunting (
  id                  uuid primary key default uuid_generate_v4(),
  organisasi_id       uuid not null references organisasi(id) on delete cascade unique,
  mata_uang           text not null default 'IDR',
  simbol_mata_uang    text not null default 'Rp',
  tahun_fiskal_mulai  int not null default 1 check (tahun_fiskal_mulai between 1 and 12),
  tanggal_mulai_sistem date,
  sistem_aktif        boolean not null default false,
  migrated_at         timestamptz,
  custom_range_dari   date,
  custom_range_sampai date,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- ─────────────────────────────────────────
-- akun_coa (Chart of Accounts — tersembunyi dari Simple)
-- ─────────────────────────────────────────
create table if not exists akun_coa (
  id              uuid primary key default uuid_generate_v4(),
  organisasi_id   uuid not null references organisasi(id) on delete cascade,
  kode            text not null,
  nama            text not null,
  tipe            text not null
                    check (tipe in ('aset', 'kewajiban', 'ekuitas', 'pendapatan', 'beban')),
  sub_tipe        text,
  parent_id       uuid references akun_coa(id) on delete set null,
  is_system       boolean not null default false,
  aktif           boolean not null default true,
  created_at      timestamptz default now(),
  unique (organisasi_id, kode)
);

create index if not exists idx_akun_coa_org on akun_coa(organisasi_id);

-- ─────────────────────────────────────────
-- akun_keuangan (tempat uang: cash, bank, e-wallet)
-- ─────────────────────────────────────────
create table if not exists akun_keuangan (
  id                uuid primary key default uuid_generate_v4(),
  organisasi_id     uuid not null references organisasi(id) on delete cascade,
  nama              text not null,
  tipe              text not null
                      check (tipe in ('cash', 'bank', 'ewallet', 'lainnya')),
  coa_id            uuid references akun_coa(id) on delete set null,
  saldo_awal        numeric(15,2) not null default 0,
  nomor_rekening    text,
  keterangan        text,
  warna             text default '#1a6b5a',
  is_default        boolean not null default false,
  aktif             boolean not null default true,
  urutan            int not null default 0,
  created_at        timestamptz default now(),
  unique (organisasi_id, nama)
);

create index if not exists idx_akun_keuangan_org on akun_keuangan(organisasi_id);

-- ─────────────────────────────────────────
-- Extend transaksi: multi-akun + transfer
-- ─────────────────────────────────────────
alter table transaksi
  drop constraint if exists transaksi_tipe_check;

alter table transaksi
  add constraint transaksi_tipe_check
  check (tipe in ('pemasukan', 'pengeluaran', 'transfer'));

alter table transaksi
  add column if not exists akun_keuangan_id uuid references akun_keuangan(id) on delete set null;

alter table transaksi
  add column if not exists akun_tujuan_id uuid references akun_keuangan(id) on delete set null;

alter table transaksi
  add column if not exists jurnal_id uuid;

create index if not exists idx_transaksi_akun on transaksi(akun_keuangan_id);

-- Map kategori → COA (opsional)
alter table kategori_transaksi
  add column if not exists coa_id uuid references akun_coa(id) on delete set null;

-- ─────────────────────────────────────────
-- jurnal + jurnal_detail (double-entry)
-- ─────────────────────────────────────────
create table if not exists jurnal (
  id              uuid primary key default uuid_generate_v4(),
  organisasi_id   uuid not null references organisasi(id) on delete cascade,
  nomor           text,
  tanggal         date not null default current_date,
  keterangan      text,
  sumber          text not null default 'manual'
                    check (sumber in ('manual', 'transaksi', 'transfer', 'utang_piutang', 'saldo_awal', 'closing', 'iuran', 'rap')),
  sumber_id       uuid,
  status          text not null default 'posted'
                    check (status in ('draft', 'posted', 'void')),
  dibuat_oleh     uuid references auth.users(id),
  created_at      timestamptz default now()
);

create index if not exists idx_jurnal_org_tanggal on jurnal(organisasi_id, tanggal);

create table if not exists jurnal_detail (
  id              uuid primary key default uuid_generate_v4(),
  jurnal_id       uuid not null references jurnal(id) on delete cascade,
  coa_id          uuid not null references akun_coa(id),
  akun_keuangan_id uuid references akun_keuangan(id) on delete set null,
  debit           numeric(15,2) not null default 0 check (debit >= 0),
  kredit          numeric(15,2) not null default 0 check (kredit >= 0),
  keterangan      text,
  check (debit > 0 or kredit > 0),
  check (not (debit > 0 and kredit > 0))
);

create index if not exists idx_jurnal_detail_jurnal on jurnal_detail(jurnal_id);
create index if not exists idx_jurnal_detail_coa on jurnal_detail(coa_id);

-- Link transaksi.jurnal_id → jurnal
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'transaksi_jurnal_id_fkey'
  ) then
    alter table transaksi
      add constraint transaksi_jurnal_id_fkey
      foreign key (jurnal_id) references jurnal(id) on delete set null;
  end if;
end $$;

-- ─────────────────────────────────────────
-- utang_piutang
-- ─────────────────────────────────────────
create table if not exists utang_piutang (
  id                uuid primary key default uuid_generate_v4(),
  organisasi_id     uuid not null references organisasi(id) on delete cascade,
  tipe              text not null check (tipe in ('utang', 'piutang')),
  nama_pihak        text not null,
  deskripsi         text,
  jumlah_awal       numeric(15,2) not null check (jumlah_awal > 0),
  jumlah_terbayar   numeric(15,2) not null default 0 check (jumlah_terbayar >= 0),
  tanggal           date not null default current_date,
  jatuh_tempo       date,
  status            text not null default 'berjalan'
                      check (status in ('berjalan', 'lunas', 'dibatalkan')),
  akun_keuangan_id  uuid references akun_keuangan(id) on delete set null,
  coa_id            uuid references akun_coa(id) on delete set null,
  jurnal_id         uuid references jurnal(id) on delete set null,
  dibuat_oleh       uuid references auth.users(id),
  created_at        timestamptz default now()
);

create index if not exists idx_utang_piutang_org on utang_piutang(organisasi_id);

create table if not exists utang_piutang_pembayaran (
  id                uuid primary key default uuid_generate_v4(),
  utang_piutang_id  uuid not null references utang_piutang(id) on delete cascade,
  jumlah            numeric(15,2) not null check (jumlah > 0),
  tanggal           date not null default current_date,
  keterangan        text,
  akun_keuangan_id  uuid references akun_keuangan(id) on delete set null,
  jurnal_id         uuid references jurnal(id) on delete set null,
  dibuat_oleh       uuid references auth.users(id),
  created_at        timestamptz default now()
);

-- ─────────────────────────────────────────
-- periode_closing
-- ─────────────────────────────────────────
create table if not exists periode_closing (
  id              uuid primary key default uuid_generate_v4(),
  organisasi_id   uuid not null references organisasi(id) on delete cascade,
  periode_dari    date not null,
  periode_sampai  date not null,
  tipe            text not null default 'bulanan'
                    check (tipe in ('bulanan', 'tahunan', 'custom')),
  catatan         text,
  jurnal_id       uuid references jurnal(id) on delete set null,
  ditutup_oleh    uuid references auth.users(id),
  ditutup_at      timestamptz default now(),
  unique (organisasi_id, periode_dari, periode_sampai)
);

-- ─────────────────────────────────────────
-- Seed helper: default COA + default akun keuangan
-- ─────────────────────────────────────────
create or replace function seed_akunting_default(p_organisasi_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_coa_kas uuid;
  v_coa_bank uuid;
  v_coa_piutang uuid;
  v_coa_utang uuid;
  v_coa_modal uuid;
  v_coa_pendapatan uuid;
  v_coa_beban uuid;
begin
  -- Skip if already seeded
  if exists (select 1 from akun_coa where organisasi_id = p_organisasi_id limit 1) then
    return;
  end if;

  insert into akun_coa (organisasi_id, kode, nama, tipe, sub_tipe, is_system)
  values
    (p_organisasi_id, '1100', 'Kas & Setara Kas', 'aset', 'kas', true)
  returning id into v_coa_kas;

  insert into akun_coa (organisasi_id, kode, nama, tipe, sub_tipe, is_system)
  values
    (p_organisasi_id, '1110', 'Bank', 'aset', 'bank', true)
  returning id into v_coa_bank;

  insert into akun_coa (organisasi_id, kode, nama, tipe, sub_tipe, is_system)
  values
    (p_organisasi_id, '1200', 'Piutang', 'aset', 'piutang', true)
  returning id into v_coa_piutang;

  insert into akun_coa (organisasi_id, kode, nama, tipe, sub_tipe, is_system)
  values
    (p_organisasi_id, '2100', 'Hutang', 'kewajiban', 'utang', true)
  returning id into v_coa_utang;

  insert into akun_coa (organisasi_id, kode, nama, tipe, sub_tipe, is_system)
  values
    (p_organisasi_id, '3100', 'Modal', 'ekuitas', 'modal', true)
  returning id into v_coa_modal;

  insert into akun_coa (organisasi_id, kode, nama, tipe, sub_tipe, is_system)
  values
    (p_organisasi_id, '3200', 'Laba Ditahan', 'ekuitas', 'laba_ditahan', true);

  insert into akun_coa (organisasi_id, kode, nama, tipe, sub_tipe, is_system)
  values
    (p_organisasi_id, '4100', 'Pendapatan', 'pendapatan', 'pendapatan', true)
  returning id into v_coa_pendapatan;

  insert into akun_coa (organisasi_id, kode, nama, tipe, sub_tipe, is_system)
  values
    (p_organisasi_id, '4200', 'Pendapatan Lain-lain', 'pendapatan', 'pendapatan_lain', true);

  insert into akun_coa (organisasi_id, kode, nama, tipe, sub_tipe, is_system)
  values
    (p_organisasi_id, '5100', 'Beban Operasional', 'beban', 'beban', true)
  returning id into v_coa_beban;

  insert into akun_coa (organisasi_id, kode, nama, tipe, sub_tipe, is_system)
  values
    (p_organisasi_id, '5200', 'Beban Lain-lain', 'beban', 'beban_lain', true);

  -- Default tempat uang
  insert into akun_keuangan (organisasi_id, nama, tipe, coa_id, is_default, urutan, warna)
  values
    (p_organisasi_id, 'Cash / Dompet', 'cash', v_coa_kas, true, 1, '#1a6b5a'),
    (p_organisasi_id, 'Bank', 'bank', v_coa_bank, false, 2, '#185FA5')
  on conflict (organisasi_id, nama) do nothing;

  -- Pengaturan default
  insert into pengaturan_akunting (organisasi_id)
  values (p_organisasi_id)
  on conflict (organisasi_id) do nothing;
end;
$$;

-- Auto-seed saat organisasi baru (opsional via trigger)
create or replace function trg_seed_akunting_on_org()
returns trigger
language plpgsql
security definer
as $$
begin
  perform seed_akunting_default(new.id);
  return new;
end;
$$;

drop trigger if exists organisasi_seed_akunting on organisasi;
create trigger organisasi_seed_akunting
  after insert on organisasi
  for each row
  execute function trg_seed_akunting_on_org();

-- Seed existing organisations
do $$
declare
  r record;
begin
  for r in select id from organisasi loop
    perform seed_akunting_default(r.id);
  end loop;
end $$;

-- ─────────────────────────────────────────
-- RPC: aktifkan sistem akunting + saldo awal
-- ─────────────────────────────────────────
create or replace function aktifkan_sistem_akunting(
  p_organisasi_id uuid,
  p_tanggal_mulai date,
  p_saldo_awal jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_item jsonb;
  v_akun_id uuid;
  v_saldo numeric;
  v_coa_modal uuid;
  v_coa_akun uuid;
  v_jurnal_id uuid;
  v_total numeric := 0;
begin
  if not is_member(p_organisasi_id) then
    raise exception 'Tidak memiliki akses ke organisasi ini';
  end if;

  perform seed_akunting_default(p_organisasi_id);

  select id into v_coa_modal
  from akun_coa
  where organisasi_id = p_organisasi_id and sub_tipe = 'modal'
  limit 1;

  for v_item in select * from jsonb_array_elements(p_saldo_awal)
  loop
    v_akun_id := (v_item->>'akun_keuangan_id')::uuid;
    v_saldo := coalesce((v_item->>'saldo_awal')::numeric, 0);

    update akun_keuangan
    set saldo_awal = v_saldo
    where id = v_akun_id and organisasi_id = p_organisasi_id;

    if v_saldo = 0 then
      continue;
    end if;

    select coa_id into v_coa_akun from akun_keuangan where id = v_akun_id;
    if v_coa_akun is null or v_coa_modal is null then
      continue;
    end if;

    insert into jurnal (organisasi_id, tanggal, keterangan, sumber, status, dibuat_oleh)
    values (
      p_organisasi_id,
      p_tanggal_mulai,
      'Saldo awal — ' || coalesce((select nama from akun_keuangan where id = v_akun_id), 'akun'),
      'saldo_awal',
      'posted',
      auth.uid()
    )
    returning id into v_jurnal_id;

    if v_saldo > 0 then
      insert into jurnal_detail (jurnal_id, coa_id, akun_keuangan_id, debit, kredit)
      values
        (v_jurnal_id, v_coa_akun, v_akun_id, v_saldo, 0),
        (v_jurnal_id, v_coa_modal, null, 0, v_saldo);
    else
      insert into jurnal_detail (jurnal_id, coa_id, akun_keuangan_id, debit, kredit)
      values
        (v_jurnal_id, v_coa_modal, null, abs(v_saldo), 0),
        (v_jurnal_id, v_coa_akun, v_akun_id, 0, abs(v_saldo));
    end if;

    v_total := v_total + v_saldo;
  end loop;

  insert into pengaturan_akunting (organisasi_id, tanggal_mulai_sistem, sistem_aktif, migrated_at, updated_at)
  values (p_organisasi_id, p_tanggal_mulai, true, now(), now())
  on conflict (organisasi_id) do update set
    tanggal_mulai_sistem = excluded.tanggal_mulai_sistem,
    sistem_aktif = true,
    migrated_at = now(),
    updated_at = now();

  return jsonb_build_object('ok', true, 'total_saldo_awal', v_total);
end;
$$;

-- ─────────────────────────────────────────
-- View: saldo per akun keuangan (dari jurnal + saldo_awal)
-- ─────────────────────────────────────────
create or replace view v_saldo_akun_keuangan as
select
  ak.id as akun_keuangan_id,
  ak.organisasi_id,
  ak.nama,
  ak.tipe,
  ak.warna,
  ak.is_default,
  ak.aktif,
  ak.urutan,
  ak.saldo_awal,
  coalesce(j.mutasi, 0) as mutasi,
  ak.saldo_awal + coalesce(j.mutasi, 0) as saldo
from akun_keuangan ak
left join (
  select
    jd.akun_keuangan_id,
    sum(jd.debit - jd.kredit) as mutasi
  from jurnal_detail jd
  join jurnal ju on ju.id = jd.jurnal_id
  where ju.status = 'posted'
    and jd.akun_keuangan_id is not null
  group by jd.akun_keuangan_id
) j on j.akun_keuangan_id = ak.id;

-- ─────────────────────────────────────────
-- View: ringkasan COA untuk laporan
-- ─────────────────────────────────────────
create or replace view v_saldo_coa as
select
  c.id as coa_id,
  c.organisasi_id,
  c.kode,
  c.nama,
  c.tipe,
  c.sub_tipe,
  coalesce(sum(case when ju.status = 'posted' then jd.debit else 0 end), 0) as total_debit,
  coalesce(sum(case when ju.status = 'posted' then jd.kredit else 0 end), 0) as total_kredit,
  case
    when c.tipe in ('aset', 'beban') then
      coalesce(sum(case when ju.status = 'posted' then jd.debit - jd.kredit else 0 end), 0)
    else
      coalesce(sum(case when ju.status = 'posted' then jd.kredit - jd.debit else 0 end), 0)
  end as saldo
from akun_coa c
left join jurnal_detail jd on jd.coa_id = c.id
left join jurnal ju on ju.id = jd.jurnal_id
group by c.id, c.organisasi_id, c.kode, c.nama, c.tipe, c.sub_tipe;

-- ─────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────
alter table pengaturan_user enable row level security;
alter table pengaturan_akunting enable row level security;
alter table akun_coa enable row level security;
alter table akun_keuangan enable row level security;
alter table jurnal enable row level security;
alter table jurnal_detail enable row level security;
alter table utang_piutang enable row level security;
alter table utang_piutang_pembayaran enable row level security;
alter table periode_closing enable row level security;

-- pengaturan_user: owner only
create policy "user_kelola_pengaturan_sendiri"
  on pengaturan_user for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and is_member(organisasi_id));

-- pengaturan_akunting
create policy "anggota_lihat_pengaturan_akunting"
  on pengaturan_akunting for select
  using (is_member(organisasi_id));

create policy "admin_kelola_pengaturan_akunting"
  on pengaturan_akunting for all
  using (get_role(organisasi_id) in ('bendahara', 'ketua') or exists (
    select 1 from organisasi o where o.id = organisasi_id and o.tipe = 'personal' and is_member(o.id)
  ))
  with check (get_role(organisasi_id) in ('bendahara', 'ketua') or exists (
    select 1 from organisasi o where o.id = organisasi_id and o.tipe = 'personal' and is_member(o.id)
  ));

-- akun_coa
create policy "anggota_lihat_coa"
  on akun_coa for select
  using (is_member(organisasi_id));

create policy "admin_kelola_coa"
  on akun_coa for all
  using (get_role(organisasi_id) in ('bendahara', 'ketua') or exists (
    select 1 from organisasi o where o.id = organisasi_id and o.tipe = 'personal' and is_member(o.id)
  ));

-- akun_keuangan
create policy "anggota_lihat_akun_keuangan"
  on akun_keuangan for select
  using (is_member(organisasi_id));

create policy "admin_kelola_akun_keuangan"
  on akun_keuangan for all
  using (get_role(organisasi_id) in ('bendahara', 'ketua') or exists (
    select 1 from organisasi o where o.id = organisasi_id and o.tipe = 'personal' and is_member(o.id)
  ));

-- jurnal
create policy "anggota_lihat_jurnal"
  on jurnal for select
  using (is_member(organisasi_id));

create policy "anggota_buat_jurnal"
  on jurnal for insert
  with check (is_member(organisasi_id));

create policy "admin_update_jurnal"
  on jurnal for update
  using (get_role(organisasi_id) in ('bendahara', 'ketua') or exists (
    select 1 from organisasi o where o.id = organisasi_id and o.tipe = 'personal' and is_member(o.id)
  ));

-- jurnal_detail
create policy "anggota_lihat_jurnal_detail"
  on jurnal_detail for select
  using (exists (
    select 1 from jurnal j where j.id = jurnal_id and is_member(j.organisasi_id)
  ));

create policy "anggota_buat_jurnal_detail"
  on jurnal_detail for insert
  with check (exists (
    select 1 from jurnal j where j.id = jurnal_id and is_member(j.organisasi_id)
  ));

-- utang_piutang
create policy "anggota_lihat_utang_piutang"
  on utang_piutang for select
  using (is_member(organisasi_id));

create policy "anggota_kelola_utang_piutang"
  on utang_piutang for all
  using (is_member(organisasi_id))
  with check (is_member(organisasi_id));

create policy "anggota_lihat_pembayaran_utang"
  on utang_piutang_pembayaran for select
  using (exists (
    select 1 from utang_piutang u where u.id = utang_piutang_id and is_member(u.organisasi_id)
  ));

create policy "anggota_kelola_pembayaran_utang"
  on utang_piutang_pembayaran for all
  using (exists (
    select 1 from utang_piutang u where u.id = utang_piutang_id and is_member(u.organisasi_id)
  ))
  with check (exists (
    select 1 from utang_piutang u where u.id = utang_piutang_id and is_member(u.organisasi_id)
  ));

-- periode_closing
create policy "anggota_lihat_closing"
  on periode_closing for select
  using (is_member(organisasi_id));

create policy "admin_kelola_closing"
  on periode_closing for all
  using (get_role(organisasi_id) in ('bendahara', 'ketua') or exists (
    select 1 from organisasi o where o.id = organisasi_id and o.tipe = 'personal' and is_member(o.id)
  ));
