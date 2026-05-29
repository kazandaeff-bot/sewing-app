// ============ Shared Salary Calculation Hook ============
// Eliminates duplicated salary logic in SewerTab, QCTab, and IroningTab

import { useMemo } from 'react'
import type { SewingTaskResponse, SewingTaskItemResponse } from '@/types'
import { filterByPeriod } from '@/lib/formatters'

/** Rate field selector — which product rate to use for salary */
export type RateField = 'sewerRate' | 'qcRate' | 'ironingRate'

/** Item statuses to include in salary calculation */
export type SalaryItemFilter = 'completed' | 'ironed'

export interface SalaryBreakdownItem {
  productId: string
  name: string
  units: number
  rate: number
  total: number
}

export interface SalaryCalculation {
  /** Total accepted units across all matching items */
  totalUnits: number
  /** Total fabric defects (sewer/QC only) */
  totalDefects: number
  /** Sum of units * rate for all matching items */
  totalSalary: number
  /** Per-product salary breakdown for display */
  breakdown: SalaryBreakdownItem[]
}

/**
 * Calculate salary from sewing tasks based on period and rate field.
 *
 * Usage:
 *   const salary = useSalaryCalculation(tasks, 'sewerRate', 'completed', period)
 *   const salary = useSalaryCalculation(tasks, 'qcRate', 'completed', period)
 *   const salary = useSalaryCalculation(tasks, 'ironingRate', 'ironed', period)
 */
export function useSalaryCalculation(
  tasks: SewingTaskResponse[],
  rateField: RateField,
  itemFilter: SalaryItemFilter,
  period: 'week' | 'month' | 'all',
  /** Optional fixed rate override (e.g. for ironing when product.ironingRate is not set) */
  fallbackRate: number = 0,
): SalaryCalculation {
  return useMemo(() => {
    // Step 1: Filter tasks by period
    const periodTasks = tasks.filter((t) => filterByPeriod(t.updatedAt, period))

    // Step 2: Flatten items, applying the status filter
    const items: Array<SewingTaskItemResponse & { taskUpdatedAt: string }> = []
    for (const t of periodTasks) {
      for (const item of t.items) {
        const include =
          itemFilter === 'completed'
            ? item.status === 'completed'
            : item.status === 'pending_qc' || item.status === 'completed'

        if (include) {
          items.push({ ...item, taskUpdatedAt: t.updatedAt })
        }
      }
    }

    // Step 3: Calculate totals
    let totalUnits = 0
    let totalDefects = 0
    let totalSalary = 0
    const byProduct: Record<string, SalaryBreakdownItem> = {}

    for (const item of items) {
      const units = item.actualQuantity || item.quantity
      const rate = (item.product as Record<string, unknown>)?.[rateField] as number || fallbackRate
      const lineTotal = units * rate
      const productKey = item.productId
      const productName = item.product?.name || 'Изделие'

      totalUnits += units
      totalDefects += item.fabricDefect || 0
      totalSalary += lineTotal

      if (!byProduct[productKey]) {
        byProduct[productKey] = { productId: productKey, name: productName, units: 0, rate, total: 0 }
      }
      byProduct[productKey].units += units
      byProduct[productKey].total += lineTotal
    }

    return {
      totalUnits,
      totalDefects,
      totalSalary,
      breakdown: Object.values(byProduct),
    }
  }, [tasks, rateField, itemFilter, period, fallbackRate])
}
