import React from 'react'
import Badge from '../ui/Badge'

/**
 * @param {object} props
 * @param {'lunas'|'belum_bayar'|'dispensasi'} props.status
 */
export default function StatusIuranBadge({ status }) {
  return <Badge status={status} />
}
