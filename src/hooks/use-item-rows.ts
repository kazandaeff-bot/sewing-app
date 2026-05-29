// ============ useItemRows Hook ============
// Eliminates the triplicated add/remove/update pattern in SewingPlansTab
// (create dialog, edit dialog, supplement dialog all had the same logic)

import { useState, useCallback } from 'react'
import type { PlanItemRow } from '@/types'

const EMPTY_ROW: PlanItemRow = { productId: '', size: '', color: '', colorHex: '#9ca3af', quantity: 0 }

export function useItemRows(initialRows?: PlanItemRow[]) {
  const [rows, setRows] = useState<PlanItemRow[]>(initialRows || [{ ...EMPTY_ROW }])

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, { ...EMPTY_ROW }])
  }, [])

  const removeRow = useCallback((index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const updateRow = useCallback((index: number, field: keyof PlanItemRow, value: string | number) => {
    setRows((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }, [])

  const resetRows = useCallback(() => {
    setRows([{ ...EMPTY_ROW }])
  }, [])

  const setRowsFromPlanItems = useCallback((items: Array<{ productId: string; size: string; color: string; colorHex: string; quantity: number }>) => {
    setRows(items.map(item => ({
      productId: item.productId,
      size: item.size,
      color: item.color,
      colorHex: item.colorHex,
      quantity: item.quantity,
    })))
  }, [])

  return {
    rows,
    setRows,
    addRow,
    removeRow,
    updateRow,
    resetRows,
    setRowsFromPlanItems,
  }
}
