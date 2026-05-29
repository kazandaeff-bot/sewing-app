// ============ useProductColorSelect Hook ============
// Eliminates the triplicated product change + color select pattern
// (create dialog, edit dialog, supplement dialog all had the same logic)

import { useCallback } from 'react'
import type { Product, PlanItemRow } from '@/types'
import { parseKitComboColors } from '@/lib/formatters'

/**
 * Returns handlers for product change and color selection with kit combo support.
 * Accepts a row setter function so it can work with any state management (useItemRows, local state, etc.)
 */
export function useProductColorSelect(
  setRows: React.Dispatch<React.SetStateAction<PlanItemRow[]>>
) {
  const handleProductChange = useCallback((index: number, productId: string) => {
    setRows(prev => prev.map((item, i) =>
      i === index ? { ...item, productId, size: '', color: '', colorHex: '#9ca3af' } : item
    ))
  }, [setRows])

  const handleColorSelect = useCallback((index: number, colorValue: string, selectedProduct: Product | undefined) => {
    if (!selectedProduct) return
    const kitCombo = parseKitComboColors(selectedProduct.kitComboColors)
    if (selectedProduct.isKit && kitCombo[colorValue]) {
      // Color value is a kit combo key (e.g. "ч/б", "к/с")
      setRows(prev => prev.map((item, i) =>
        i === index ? { ...item, color: colorValue, colorHex: '#808080' } : item
      ))
    } else {
      const colorObj = selectedProduct.colors.find(c => c.color === colorValue)
      setRows(prev => prev.map((item, i) =>
        i === index ? { ...item, color: colorValue, colorHex: colorObj?.colorHex || '#9ca3af' } : item
      ))
    }
  }, [setRows])

  return { handleProductChange, handleColorSelect }
}
