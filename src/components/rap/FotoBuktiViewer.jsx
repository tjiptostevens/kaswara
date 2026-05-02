import React, { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Camera, X } from 'lucide-react'

/**
 * @param {object} props
 * @param {string} props.rapId
 * @param {Array} props.fotos - Array of { id, storage_path, nama_file }
 */
export default function FotoBuktiViewer({ rapId, fotos = [] }) {
  const [preview, setPreview] = useState(null)

  const getUrl = (path) => {
    const { data } = supabase.storage.from('rap-foto').getPublicUrl(path)
    return data.publicUrl
  }

  if (fotos.length === 0) {
    return (
      <div className="flex items-center gap-2 text-stone text-sm py-4 border border-dashed border-border rounded-card">
        <Camera size={18} className="mx-auto" />
        <span className="mx-auto">Belum ada foto bukti</span>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {fotos.map((foto) => (
          <button
            key={foto.id}
            onClick={() => setPreview(getUrl(foto.storage_path))}
            className="aspect-square rounded-input overflow-hidden border border-border hover:border-brand transition-colors"
          >
            <img
              src={getUrl(foto.storage_path)}
              alt={foto.nama_file}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {preview && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-stone"
            onClick={() => setPreview(null)}
          >
            <X size={24} />
          </button>
          <img
            src={preview}
            alt="Bukti"
            className="max-w-full max-h-full rounded-card"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
