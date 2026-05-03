# UI Component Architecture

Komponen pada folder ini dirancang sebagai primitive reusable yang:

- Konsisten secara visual (berbasis token class Tailwind yang sama)
- Aman dipakai di production (state loading, empty, error)
- Accessible by default (label, role, aria attribute, keyboard behavior)
- Mudah dikomposisi untuk kebutuhan fitur halaman

## Layers

- Primitive input/action: `Button`, `Input`
- Overlay: `Modal`
- Data display: `Table`
- State helpers: `Spinner`, `Skeleton`, `EmptyState`

## Props Design (Ringkas)

### `Button`

Props utama:

- `variant`: `primary | secondary | accent | ghost | danger`
- `size`: `sm | md | lg`
- `loading`: lock aksi dan tampil spinner
- `loadingText`: teks saat loading
- `leftIcon`, `rightIcon` (`icon` tetap didukung untuk kompatibilitas)
- `fullWidth`, `iconOnly`

Contoh:

```jsx
<Button
  variant="primary"
  loading={saving}
  loadingText="Menyimpan..."
  leftIcon={<Save size={16} />}
>
  Simpan perubahan
</Button>
```

### `Input`

Props utama:

- `label`: auto render `<label htmlFor>`
- `error`: set `aria-invalid` + message `role="alert"`
- `hint`: helper text via `aria-describedby`
- `leftIcon`, `rightIcon`
- `as`: `input | textarea`

Contoh:

```jsx
<Input
  label="Nama Kegiatan"
  placeholder="Contoh: Kerja bakti"
  hint="Gunakan nama singkat dan jelas"
  error={errors.nama_kegiatan?.message}
  {...register('nama_kegiatan')}
/>

<Input
  as="textarea"
  label="Deskripsi"
  rows={5}
  placeholder="Tuliskan detail kegiatan"
/>
```

### `Modal`

Props utama:

- `open`, `onClose`, `title`, `description`
- `size`: `sm | md | lg`
- `closeOnBackdrop`, `closeOnEscape`
- `showCloseButton`, `initialFocusRef`

Perilaku:

- Escape untuk menutup (default aktif)
- Scroll body dikunci saat modal terbuka
- Fokus dikembalikan ke elemen sebelumnya saat modal ditutup

Contoh:

```jsx
<Modal
  open={addOpen}
  onClose={() => setAddOpen(false)}
  title="Tambah kategori"
  description="Lengkapi informasi kategori sebelum menyimpan"
>
  <FormKategori onSubmit={handleAdd} onCancel={() => setAddOpen(false)} />
</Modal>
```

### `Table`

Props utama:

- `columns`, `data`, `rowKey`
- `loading`, `loadingText`
- `error`, `errorText`, `onRetry`
- `emptyText`, `caption`

Contoh:

```jsx
<Table
  caption="Daftar transaksi kas warga"
  columns={columns}
  data={transaksi}
  rowKey="id"
  loading={loading}
  error={errorMessage}
  onRetry={fetchTransaksi}
  emptyText="Belum ada transaksi"
/>
```

### State Helpers

```jsx
{
  loading && <Spinner label="Mengambil data dashboard..." />;
}

{
  loading ? (
    <Skeleton lines={4} />
  ) : (
    <EmptyState
      title="Belum ada data iuran"
      description="Tambahkan iuran pertama untuk mulai pelacakan."
      action={<Button onClick={() => setOpen(true)}>Tambah iuran</Button>}
    />
  );
}
```

## Edge Cases Covered

- Button menonaktifkan aksi saat loading
- Input tanpa `id` tetap aman dengan generated id unik
- Table tetap render aman saat kolom kosong atau data tidak valid
- Modal support close escape/backdrop yang bisa dinonaktifkan untuk flow kritikal
- Semua state penting memiliki semantic role dan `aria-live` seperlunya
