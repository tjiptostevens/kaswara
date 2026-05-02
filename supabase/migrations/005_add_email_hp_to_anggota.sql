-- 005_add_email_hp_to_anggota.sql
-- Kaswara — tambahkan kolom email dan no_hp pada tabel anggota_organisasi

alter table anggota_organisasi
  add column if not exists email text,
  add column if not exists no_hp  text;
