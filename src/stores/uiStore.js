import { create } from 'zustand'
import { toast as hotToast } from 'react-hot-toast'

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
    if (type === 'success') hotToast.success(message)
    else if (type === 'error') hotToast.error(message)
    else hotToast(message)
  },
  clearToast: () => hotToast.dismiss(),
}))

export default useUIStore
