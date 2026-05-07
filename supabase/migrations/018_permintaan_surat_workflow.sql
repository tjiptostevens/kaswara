-- 018_permintaan_surat_workflow.sql
-- Kaswara — fitur permintaan surat anggota

create table if not exists permintaan_surat (
  id                    uuid primary key default uuid_generate_v4(),
  organisasi_id         uuid not null references organisasi(id) on delete cascade,
  judul                 text not null,
  keperluan             text not null,
  detail                text,
  status                text not null default 'draft'
                        check (status in ('draft', 'diajukan', 'selesai', 'cancelled')),
  hasil_status          text
                        check (hasil_status in ('approve', 'reject')),
  catatan_pemroses      text,
  tanggal_pengajuan     date,
  diajukan_at           timestamptz,
  selesai_at            timestamptz,
  selesai_by            uuid references auth.users(id),
  cancelled_at          timestamptz,
  cancelled_by          uuid references auth.users(id),
  dibuat_oleh           uuid not null references auth.users(id),
  dibuat_oleh_anggota_id uuid references anggota_organisasi(id),
  created_at            timestamptz default now()
);

alter table permintaan_surat enable row level security;

drop policy if exists "anggota_bisa_lihat_permintaan_surat" on permintaan_surat;
create policy "anggota_bisa_lihat_permintaan_surat"
  on permintaan_surat for select
  using (is_member(organisasi_id));

drop policy if exists "anggota_bisa_buat_permintaan_surat" on permintaan_surat;
create policy "anggota_bisa_buat_permintaan_surat"
  on permintaan_surat for insert
  with check (
    is_member(organisasi_id)
    and dibuat_oleh = auth.uid()
  );

drop policy if exists "pemohon_bisa_update_draft_permintaan_surat" on permintaan_surat;
create policy "pemohon_bisa_update_draft_permintaan_surat"
  on permintaan_surat for update
  using (
    dibuat_oleh = auth.uid()
    and status in ('draft', 'diajukan')
  );

drop policy if exists "ketua_bendahara_bisa_proses_permintaan_surat" on permintaan_surat;
create policy "ketua_bendahara_bisa_proses_permintaan_surat"
  on permintaan_surat for update
  using (get_role(organisasi_id) in ('bendahara', 'ketua'));

drop policy if exists "pemohon_bisa_hapus_draft_permintaan_surat" on permintaan_surat;
create policy "pemohon_bisa_hapus_draft_permintaan_surat"
  on permintaan_surat for delete
  using (
    dibuat_oleh = auth.uid()
    and status = 'draft'
  );
