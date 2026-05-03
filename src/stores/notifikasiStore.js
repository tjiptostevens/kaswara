import { create } from 'zustand'

const useNotifikasiStore = create((set) => ({
  notifikasi: [],

  tambahNotif: (pesan, tipe = 'info') => {
    const item = {
      id: crypto.randomUUID(),
      pesan,
      tipe,          // 'info' | 'success' | 'warning'
      dibacaAt: null,
      createdAt: new Date().toISOString(),
    }
    set((state) => ({ notifikasi: [item, ...state.notifikasi].slice(0, 30) }))
  },

  tandaiDibaca: (id) => {
    set((state) => ({
      notifikasi: state.notifikasi.map((n) =>
        n.id === id ? { ...n, dibacaAt: new Date().toISOString() } : n
      ),
    }))
  },

  tandaiSemuaDibaca: () => {
    const now = new Date().toISOString()
    set((state) => ({
      notifikasi: state.notifikasi.map((n) =>
        n.dibacaAt ? n : { ...n, dibacaAt: now }
      ),
    }))
  },

  hapusSemua: () => set({ notifikasi: [] }),
}))

export default useNotifikasiStore
