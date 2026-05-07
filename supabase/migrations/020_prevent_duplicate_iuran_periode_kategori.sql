-- 020_prevent_duplicate_iuran_periode_kategori.sql
-- Cegah duplikasi iuran aktif untuk anggota + kategori + periode bulan yang sama.

create unique index if not exists iuran_rutin_unique_active_member_category_month
  on iuran_rutin (
    organisasi_id,
    anggota_id,
    kategori_iuran_id,
    date_trunc('month', periode)
  )
  where kategori_iuran_id is not null
    and status in ('draft', 'diajukan', 'lunas');
