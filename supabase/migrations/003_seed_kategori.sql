-- 003_seed_kategori.sql
-- Kaswara — Seed default category for a new organisation
-- Usage: call after creating an organisasi row, substituting the org UUID

-- Example usage (run with your organisation ID):
-- select seed_default_kategori('your-organisasi-id-here');

create or replace function seed_default_kategori(p_organisasi_id uuid)
returns void
language plpgsql security definer
as $$
begin
  insert into kategori_transaksi (organisasi_id, nama, tipe) values
    (p_organisasi_id, 'Iuran Warga',              'pemasukan'),
    (p_organisasi_id, 'Donasi',                   'pemasukan'),
    (p_organisasi_id, 'Kebersihan',               'pengeluaran'),
    (p_organisasi_id, 'Keamanan',                 'pengeluaran'),
    (p_organisasi_id, 'Sosial',                   'pengeluaran'),
    (p_organisasi_id, 'Perbaikan & Pemeliharaan', 'pengeluaran'),
    (p_organisasi_id, 'Administrasi',             'pengeluaran'),
    (p_organisasi_id, 'Kegiatan RT/RW',           'pengeluaran'),
    (p_organisasi_id, 'Lain-lain',                'keduanya');
end;
$$;
