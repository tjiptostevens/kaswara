import React from 'react'
import { Loader2 } from 'lucide-react'

/**
 * @param {object} props
 * @param {Array<{key: string, label: string, render?: (row) => React.ReactNode}>} props.columns
 * @param {Array<object>} props.data
 * @param {boolean} props.loading
 * @param {string} props.loadingText
 * @param {string} props.emptyText
 */
export default function Table({
  columns = [],
  data = [],
  loading = false,
  loadingText = 'Memuat data...',
  emptyText = 'Belum ada data',
  error,
  errorText = 'Terjadi kesalahan saat memuat data',
  caption,
  rowKey = 'id',
  onRetry,
}) {
  const hasColumns = columns.length > 0

  return (
    <div className="overflow-x-auto glass-card rounded-card border-none" aria-live="polite">
      <table className="w-full text-sm" aria-busy={loading}>
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="bg-brand/5 border-b border-brand/10">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-stone uppercase tracking-wide"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40 bg-white/30">
          {loading ? (
            <tr>
              <td colSpan={Math.max(columns.length, 1)} className="py-10 text-center text-stone">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  <span>{loadingText}</span>
                </div>
              </td>
            </tr>
          ) : error ? (
            <tr>
              <td colSpan={Math.max(columns.length, 1)} className="py-10 text-center text-danger">
                <div className="space-y-3">
                  <p>{typeof error === 'string' ? error : errorText}</p>
                  {onRetry && (
                    <button
                      type="button"
                      className="text-sm font-medium underline underline-offset-2 hover:opacity-80"
                      onClick={onRetry}
                    >
                      Coba lagi
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={Math.max(columns.length, 1)} className="py-10 text-center text-stone">
                {emptyText}
              </td>
            </tr>
          ) : !hasColumns ? (
            <tr>
              <td className="py-10 text-center text-stone">Konfigurasi kolom belum tersedia</td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr key={row?.[rowKey] ?? row.id ?? idx} className="hover:bg-white/40 transition-colors duration-150">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-charcoal">
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
