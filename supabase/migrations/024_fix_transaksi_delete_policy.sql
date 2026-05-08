-- 024_fix_transaksi_delete_policy.sql
-- Migration 022 dropped "bendahara_kelola_transaksi" (for all, incl. DELETE)
-- but only created replacement INSERT and UPDATE policies for transaksi.
-- This migration adds the missing DELETE policy aligned with the permission matrix.

drop policy if exists "anggota_hapus_transaksi" on transaksi;
create policy "anggota_hapus_transaksi"
  on transaksi for delete
  using (
    -- Matrix baru: delete dengan scope any (own atau all)
    has_permission(organisasi_id, 'transaksi', 'delete', 'any')
    -- Fallback: bendahara selalu bisa hapus
    or get_role(organisasi_id) = 'bendahara'
    -- Personal workspace: owner bisa hapus
    or exists (
      select 1 from organisasi o
      where o.id = transaksi.organisasi_id
        and o.tipe = 'personal'
        and o.created_by = auth.uid()
    )
  );
