// ============ Shared Formatting & Helper Functions ============

/**
 * Parse kitComboColors field — handles both JSON string and parsed object
 */
export function parseKitComboColors(raw: string | Record<string, string[]> | null | undefined): Record<string, string[]> {
  if (!raw) return {}
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch {
    return {}
  }
}

/**
 * Get kit label for product display (e.g. " [ч/б, к/с]")
 */
export function getKitLabel(p: { isKit: boolean; kitComboColors?: string | Record<string, string[]> | null }): string {
  if (!p.isKit) return ''
  const kit = parseKitComboColors(p.kitComboColors)
  const keys = Object.keys(kit)
  return keys.length > 0 ? ` [${keys.join(', ')}]` : ' [комплект]'
}

/**
 * Get Russian role label from role string
 */
export function getRoleLabel(role: string): string {
  switch (role) {
    case 'sewer': return 'Швея'
    case 'qc': return 'ОТК'
    case 'supervisor': return 'Руководитель'
    case 'seller': return 'Селлер'
    case 'technologist': return 'Технолог'
    case 'cutter': return 'Закройщик'
    case 'ironing': return 'ВТО'
    case 'customer': return 'Заказчик'
    default: return role
  }
}

/**
 * Format date string to short timing display (DD.MM HH:MM)
 */
export function formatTiming(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${day}.${month} ${hours}:${minutes}`
  } catch {
    return ''
  }
}

/**
 * Format date string to full Russian locale display
 */
export function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

/**
 * Filter tasks/items by salary period
 */
export function filterByPeriod(dateStr: string | null | undefined, period: 'week' | 'month' | 'all'): boolean {
  if (period === 'all') return true
  if (!dateStr) return false
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  return period === 'week' ? diffDays <= 7 : diffDays <= 30
}

/**
 * Get period label in Russian
 */
export function getPeriodLabel(period: 'week' | 'month' | 'all'): string {
  return period === 'week' ? 'за неделю' : period === 'month' ? 'за месяц' : 'за всё время'
}

/**
 * Open print dialog for a document
 */
export async function printDocument(type: string, id: string): Promise<void> {
  try {
    const res = await fetch(`/api/print?type=${type}&id=${id}`)
    const data = await res.json()
    if (data.html) {
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(data.html)
        printWindow.document.close()
        printWindow.onload = () => printWindow.print()
      }
    }
  } catch {
    // silently fail
  }
}
