-- 004_fix_organisasi_rls.sql
-- Add created_by to organisasi for proper ownership tracking and fix RLS policies

alter table organisasi
  add column if not exists created_by uuid references auth.users(id);

-- ─────────────────────────────────────────
-- organisasi policies (idempotent rebuild)
-- ─────────────────────────────────────────
drop policy if exists "siapa_saja_bisa_buat_organisasi"   on organisasi;
drop policy if exists "anggota_bisa_lihat_organisasi"     on organisasi;

-- Only authenticated users may create an organisasi, and they must set themselves as creator
create policy "pengguna_terautentikasi_bisa_buat_organisasi"
  on organisasi for insert
  with check (auth.uid() = created_by);

-- A user can see an organisasi if they are a member OR if they created it
-- (covers the window between creation and being added to anggota_organisasi)
create policy "anggota_atau_pembuat_bisa_lihat_organisasi"
  on organisasi for select
  using (is_member(id) OR created_by = auth.uid());
