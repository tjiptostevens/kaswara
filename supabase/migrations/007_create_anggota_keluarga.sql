-- 007_create_anggota_keluarga.sql
-- Kaswara — tabel anggota_keluarga untuk fitur "Keluarga"
-- Setiap anggota dapat mendaftarkan anggota keluarganya di dalam organisasi.

create table if not exists anggota_keluarga (
  id              uuid primary key default uuid_generate_v4(),
  anggota_id      uuid references anggota_organisasi(id) on delete cascade not null,
  organisasi_id   uuid references organisasi(id) on delete cascade not null,
  nama            text not null,
  hubungan        text not null check (hubungan in ('suami', 'istri', 'anak', 'orang_tua', 'lainnya')),
  tanggal_lahir   date,
  created_at      timestamptz default now()
);

alter table anggota_keluarga enable row level security;

-- Semua anggota aktif dalam organisasi dapat melihat daftar keluarga di organisasinya
create policy "anggota_bisa_lihat_keluarga"
  on anggota_keluarga for select
  using (is_member(organisasi_id));

-- Anggota hanya bisa mengelola data keluarga miliknya sendiri;
-- bendahara dan ketua bisa mengelola semua data keluarga
create policy "anggota_kelola_keluarga_sendiri"
  on anggota_keluarga for all
  using (
    anggota_id = (
      select id from anggota_organisasi
      where user_id = auth.uid()
        and organisasi_id = anggota_keluarga.organisasi_id
        and aktif = true
      limit 1
    )
    or get_role(organisasi_id) in ('bendahara', 'ketua')
  );
