import { create } from 'zustand'

const useUIStore = create((set) => ({
  sidebarOpen: true,
  modalOpen: false,
  modalContent: null,
  toast: null,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  openModal: (content) => set({ modalOpen: true, modalContent: content }),
  closeModal: () => set({ modalOpen: false, modalContent: null }),

  showToast: (message, type = 'success') => {
    set({ toast: { message, type } })
    setTimeout(() => set({ toast: null }), 3500)
  },
  clearToast: () => set({ toast: null }),
}))

export default useUIStore
