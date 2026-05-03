import { useState, useEffect, useCallback } from 'react'

export function useBrowserNotification() {
  const [permission, setPermission] = useState('default')

  useEffect(() => {
    if (!('Notification' in window)) {
      console.warn('Browser ini tidak mendukung notifikasi desktop')
      return
    }
    setPermission(Notification.permission)
  }, [])

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return false
    const result = await Notification.requestPermission()
    setPermission(result)
    return result === 'granted'
  }, [])

  const sendNotification = useCallback((title, options = {}) => {
    if (permission === 'granted') {
      const notification = new Notification(title, {
        icon: '/vite.svg', // Default icon, ganti dengan logo Kaswara jika ada
        ...options,
      })

      if (options.onClick) {
        notification.onclick = (e) => {
          e.preventDefault()
          window.focus()
          options.onClick(e)
          notification.close()
        }
      }

      return notification
    }
    return null
  }, [permission])

  return { permission, requestPermission, sendNotification }
}
