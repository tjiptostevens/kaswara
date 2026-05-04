-- 016_storage_bucket_rap_foto.sql
-- Kaswara — Create and configure the rap-foto storage bucket

-- ─────────────────────────────────────────
-- 1. Create the bucket (public so getPublicUrl works)
-- ─────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'rap-foto',
  'rap-foto',
  true,
  10485760,   -- 10 MB per file
  array['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif']
)
on conflict (id) do update
  set public             = true,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ─────────────────────────────────────────
-- 2. Storage RLS policies
-- ─────────────────────────────────────────

-- Public read (required for getPublicUrl to serve images)
drop policy if exists "rap_foto_public_read" on storage.objects;
create policy "rap_foto_public_read"
  on storage.objects for select
  using (bucket_id = 'rap-foto');

-- Any authenticated user can upload (RAP creator = bendahara based on UI gate)
drop policy if exists "rap_foto_auth_upload" on storage.objects;
create policy "rap_foto_auth_upload"
  on storage.objects for insert
  with check (
    bucket_id = 'rap-foto'
    and auth.uid() is not null
  );

-- Owner / authenticated users can delete their own uploads
drop policy if exists "rap_foto_auth_delete" on storage.objects;
create policy "rap_foto_auth_delete"
  on storage.objects for delete
  using (
    bucket_id = 'rap-foto'
    and auth.uid() is not null
  );
