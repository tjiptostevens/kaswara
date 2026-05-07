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

-- Rapikan duplikasi data lama terlebih dulu agar unique index bisa dibuat.
-- Strategi: simpan 1 baris "pemenang" per kombinasi, lalu batalkan sisanya.
with ranked as (
  select
    i.id,
    i.transaksi_id,
    row_number() over (
      partition by i.organisasi_id, i.anggota_id, i.kategori_iuran_id, i.periode
      order by
        case when i.status in ('diajukan', 'lunas') then 0 else 1 end,
        case when i.transaksi_id is not null then 0 else 1 end,
        i.diajukan_at desc nulls last,
        i.id desc
    ) as rn
  from iuran_rutin i
  where i.kategori_iuran_id is not null
    and i.status in ('draft', 'diajukan', 'lunas')
),
to_cancel as (
  select id, transaksi_id
  from ranked
  where rn > 1
)
update transaksi t
set status = 'cancelled',
    cancelled_at = now(),
    cancelled_by = null
from to_cancel d
where t.id = d.transaksi_id
  and t.status not in ('cancelled', 'amended');

with ranked as (
  select
    i.id,
    row_number() over (
      partition by i.organisasi_id, i.anggota_id, i.kategori_iuran_id, i.periode
      order by
        case when i.status in ('diajukan', 'lunas') then 0 else 1 end,
        case when i.transaksi_id is not null then 0 else 1 end,
        i.diajukan_at desc nulls last,
        i.id desc
    ) as rn
  from iuran_rutin i
  where i.kategori_iuran_id is not null
    and i.status in ('draft', 'diajukan', 'lunas')
)
update iuran_rutin i
set status = 'cancelled',
    cancelled_at = now(),
    cancelled_by = null
from ranked r
where i.id = r.id
  and r.rn > 1
  and i.status in ('draft', 'diajukan', 'lunas');

create unique index if not exists iuran_rutin_unique_active_member_category_month
  on iuran_rutin (
    organisasi_id,
    anggota_id,
    kategori_iuran_id,
    periode
  )
  where kategori_iuran_id is not null
    and status in ('draft', 'diajukan', 'lunas');
