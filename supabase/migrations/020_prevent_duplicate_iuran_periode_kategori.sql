-- 020_prevent_duplicate_iuran_periode_kategori.sql
-- Cegah duplikasi iuran aktif untuk anggota + kategori + periode bulan yang sama.
-- Gunakan kolom periode langsung (tanpa expression index) agar kompatibel Postgres/Supabase.

-- Optional guard: periode harus disimpan sebagai tanggal awal bulan (YYYY-MM-01).
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'iuran_rutin_periode_awal_bulan_check'
  ) then
    alter table iuran_rutin
      add constraint iuran_rutin_periode_awal_bulan_check
      check (extract(day from periode) = 1);
  end if;
end $$;

create unique index if not exists iuran_rutin_unique_active_member_category_month
  on iuran_rutin (
    organisasi_id,
    anggota_id,
    kategori_iuran_id,
    periode
  )
  where kategori_iuran_id is not null
    and status in ('draft', 'diajukan', 'lunas');
