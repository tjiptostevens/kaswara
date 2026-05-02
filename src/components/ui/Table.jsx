import React from 'react'
import { Loader2 } from 'lucide-react'

/**
 * @param {object} props
 * @param {Array<{key: string, label: string, render?: (row) => React.ReactNode}>} props.columns
 * @param {Array<object>} props.data
 * @param {boolean} props.loading
 * @param {string} props.emptyText
 */
export default function Table({
  columns = [],
  data = [],
  loading = false,
  emptyText = 'Belum ada data',
}) {
  return (
    <div className="overflow-x-auto rounded-card border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-warm border-b border-border">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-xs font-medium text-stone uppercase tracking-wide"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-white">
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="py-10 text-center text-stone">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  <span>Memuat data...</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-10 text-center text-stone">
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr key={row.id ?? idx} className="hover:bg-warm/50 transition-colors">
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
