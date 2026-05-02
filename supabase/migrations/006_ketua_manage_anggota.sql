-- 006_ketua_manage_anggota.sql
-- Kaswara — izinkan ketua mengelola anggota_organisasi (sama seperti bendahara)

-- Hapus policy lama yang hanya untuk bendahara
drop policy if exists "bendahara_bisa_kelola_anggota" on anggota_organisasi;

-- Buat policy baru: bendahara DAN ketua bisa mengelola anggota
create policy "bendahara_ketua_kelola_anggota"
  on anggota_organisasi for all
  using (get_role(organisasi_id) in ('bendahara', 'ketua'));
