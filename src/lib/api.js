/**
 * Centralized API layer for Supabase queries
 * Benefits:
 * - Consistent query patterns and joins
 * - Easier to add logging, retry logic, caching
 * - Single place to manage table structure changes
 * - Enables gradual migration to backend API
 */

import { supabase } from './supabase'

const API = {
    /**
     * TRANSAKSI
     */
    transaksi: {
        /**
         * Fetch transaksi with related data
         * @param {string} organisasiId
         * @param {Object} filters - { tipe, kategoriId, dari, sampai, status, limit, offset }
         */
        list: async (organisasiId, filters = {}) => {
            let query = supabase
                .from('transaksi')
                .select('*, kategori_transaksi(nama, tipe), anggota_organisasi(nama_lengkap)')
                .eq('organisasi_id', organisasiId)
                .order('tanggal', { ascending: false })

            if (filters.tipe) query = query.eq('tipe', filters.tipe)
            if (filters.kategoriId) query = query.eq('kategori_id', filters.kategoriId)
            if (filters.dari) query = query.gte('tanggal', filters.dari)
            if (filters.sampai) query = query.lte('tanggal', filters.sampai)
            if (filters.status) query = query.eq('status', filters.status)

            return query
        },

        get: async (id) => {
            return supabase
                .from('transaksi')
                .select('*, kategori_transaksi(*), anggota_organisasi(*)')
                .eq('id', id)
                .single()
        },

        create: async (data) => {
            return supabase
                .from('transaksi')
                .insert({ ...data, status: 'draft' })
                .select()
                .single()
        },

        update: async (id, updates) => {
            return supabase
                .from('transaksi')
                .update(updates)
                .eq('id', id)
                .select()
                .single()
        },

        delete: async (id) => {
            return supabase.from('transaksi').delete().eq('id', id)
        },
    },

    /**
     * KATEGORI
     */
    kategori: {
        list: async (organisasiId) => {
            return supabase
                .from('kategori_transaksi')
                .select('*')
                .eq('organisasi_id', organisasiId)
                .order('nama')
        },

        create: async (data) => {
            return supabase
                .from('kategori_transaksi')
                .insert(data)
                .select()
                .single()
        },

        update: async (id, updates) => {
            return supabase
                .from('kategori_transaksi')
                .update(updates)
                .eq('id', id)
                .select()
                .single()
        },

        delete: async (id) => {
            return supabase.from('kategori_transaksi').delete().eq('id', id)
        },
    },

    /**
     * RAB (Rencana Anggaran Biaya)
     */
    rab: {
        list: async (organisasiId) => {
            return supabase
                .from('rab')
                .select('*, rab_item(*), anggota_organisasi!dibuat_oleh_anggota_id(nama_lengkap)')
                .eq('organisasi_id', organisasiId)
                .order('created_at', { ascending: false })
        },

        get: async (id) => {
            return supabase
                .from('rab')
                .select('*, rab_item(*), anggota_organisasi!dibuat_oleh_anggota_id(nama_lengkap)')
                .eq('id', id)
                .single()
        },

        create: async (data) => {
            const { items, ...rabData } = data
            const total_anggaran = (items || []).reduce(
                (sum, item) => sum + (Number(item.volume) || 0) * (Number(item.harga_satuan) || 0),
                0
            )

            const result = await supabase
                .from('rab')
                .insert({ ...rabData, total_anggaran })
                .select()
                .single()

            if (result.error) return result

            if (items?.length) {
                const itemsWithRabId = items.map((item) => ({
                    ...item,
                    rab_id: result.data.id,
                    subtotal: item.volume * item.harga_satuan,
                }))
                await supabase.from('rab_item').insert(itemsWithRabId)
            }

            return result
        },

        update: async (id, updates) => {
            return supabase.from('rab').update(updates).eq('id', id).select().single()
        },

        delete: async (id) => {
            return supabase.from('rab').delete().eq('id', id)
        },
    },

    /**
     * RAP (Realisasi Anggaran Pengeluaran)
     */
    rap: {
        list: async (organisasiId) => {
            return supabase
                .from('rap')
                .select('*, rap_foto(*), rab(nama_kegiatan), anggota_organisasi!dibuat_oleh_anggota_id(nama_lengkap)')
                .eq('organisasi_id', organisasiId)
                .order('created_at', { ascending: false })
        },

        get: async (id) => {
            return supabase
                .from('rap')
                .select('*, rap_foto(*), rab(nama_kegiatan), anggota_organisasi!dibuat_oleh_anggota_id(nama_lengkap)')
                .eq('id', id)
                .single()
        },

        create: async (data) => {
            return supabase
                .from('rap')
                .insert({ ...data, status: 'draft' })
                .select()
                .single()
        },

        update: async (id, updates) => {
            return supabase.from('rap').update(updates).eq('id', id).select().single()
        },

        delete: async (id) => {
            return supabase.from('rap').delete().eq('id', id)
        },
    },

    /**
     * ANGGOTA (Organization Members)
     */
    anggota: {
        list: async (organisasiId) => {
            return supabase
                .from('anggota_organisasi')
                .select('*')
                .eq('organisasi_id', organisasiId)
                .eq('aktif', true)
                .order('nama_lengkap')
        },

        get: async (id) => {
            return supabase.from('anggota_organisasi').select('*').eq('id', id).single()
        },

        create: async (data) => {
            // Note: This uses edge function for user creation
            return supabase.functions.invoke('create-anggota-with-auth', { body: data })
        },

        update: async (id, updates) => {
            return supabase
                .from('anggota_organisasi')
                .update(updates)
                .eq('id', id)
                .select()
                .single()
        },

        delete: async (id) => {
            return supabase
                .from('anggota_organisasi')
                .update({ aktif: false })
                .eq('id', id)
        },
    },

    /**
     * IURAN (Membership Fees)
     */
    iuran: {
        list: async (organisasiId, periode = null) => {
            let query = supabase
                .from('iuran_rutin')
                .select('*, anggota_organisasi(nama_lengkap)')
                .eq('organisasi_id', organisasiId)
                .order('periode', { ascending: false })

            if (periode) query = query.eq('periode', periode)

            return query
        },

        create: async (data) => {
            return supabase
                .from('iuran_rutin')
                .insert(data)
                .select()
                .single()
        },

        update: async (id, updates) => {
            return supabase
                .from('iuran_rutin')
                .update(updates)
                .eq('id', id)
                .select()
                .single()
        },
    },

    /**
     * ORGANISASI (Workspaces)
     */
    organisasi: {
        get: async (id) => {
            return supabase.from('organisasi').select('*').eq('id', id).single()
        },

        create: async (data) => {
            return supabase.from('organisasi').insert(data).select().single()
        },

        update: async (id, updates) => {
            return supabase
                .from('organisasi')
                .update(updates)
                .eq('id', id)
                .select()
                .single()
        },
    },

    /**
     * STORAGE (File uploads)
     */
    storage: {
        /**
         * Upload file to Supabase storage
         * @param {string} bucket - Storage bucket name
         * @param {string} path - File path in bucket
         * @param {File} file - File to upload
         */
        upload: async (bucket, path, file) => {
            return supabase.storage.from(bucket).upload(path, file)
        },

        /**
         * Get public URL for uploaded file
         * @param {string} bucket
         * @param {string} path
         */
        getPublicUrl: (bucket, path) => {
            return supabase.storage.from(bucket).getPublicUrl(path)
        },

        /**
         * Delete file from storage
         * @param {string} bucket
         * @param {string} path
         */
        delete: (bucket, path) => {
            return supabase.storage.from(bucket).remove([path])
        },
    },
}

export default API
