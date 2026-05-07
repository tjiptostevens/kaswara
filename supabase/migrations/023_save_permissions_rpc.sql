-- 023_save_permissions_rpc.sql
-- RPC publik untuk menyimpan/upsert permission anggota
-- Menggunakan SECURITY DEFINER agar bypass RLS tabel,
-- dengan pengecekan otorisasi di dalam fungsi.

create or replace function save_anggota_permissions(
  p_ao_id       uuid,
  p_permissions jsonb  -- [{"resource":"transaksi","action":"create","scope":"all"}, ...]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organisasi_id uuid;
  v_perm          jsonb;
begin
  -- Ambil organisasi_id dari target anggota
  select organisasi_id into v_organisasi_id
  from anggota_organisasi
  where id = p_ao_id;

  if v_organisasi_id is null then
    raise exception 'anggota_organisasi tidak ditemukan';
  end if;

  -- Otorisasi: pemanggil harus ketua atau bendahara aktif di org yang sama
  if not exists (
    select 1 from anggota_organisasi
    where user_id       = auth.uid()
      and organisasi_id = v_organisasi_id
      and aktif         = true
      and role in ('ketua', 'bendahara')
  ) then
    raise exception 'Akses ditolak: hanya ketua atau bendahara yang dapat mengubah permission';
  end if;

  -- Validasi dan upsert setiap baris permission
  for v_perm in select * from jsonb_array_elements(p_permissions)
  loop
    if (v_perm->>'resource') not in ('transaksi', 'iuran', 'rab', 'rap', 'surat') then
      raise exception 'Resource tidak valid: %', v_perm->>'resource';
    end if;
    if (v_perm->>'action') not in ('create', 'read', 'update', 'delete', 'submit', 'approve', 'cancel') then
      raise exception 'Action tidak valid: %', v_perm->>'action';
    end if;
    if (v_perm->>'scope') not in ('none', 'own', 'all') then
      raise exception 'Scope tidak valid: %', v_perm->>'scope';
    end if;

    insert into anggota_permission (anggota_organisasi_id, resource, action, scope)
    values (
      p_ao_id,
      v_perm->>'resource',
      v_perm->>'action',
      v_perm->>'scope'
    )
    on conflict (anggota_organisasi_id, resource, action)
    do update set scope = excluded.scope;
  end loop;
end;
$$;
