// ============ Shared Constants ============

/** Employee role options with Russian labels — single source of truth */
export const EMPLOYEE_ROLES: { value: string; label: string }[] = [
  { value: 'sewer', label: 'Швея' },
  { value: 'qc', label: 'ОТК' },
  { value: 'supervisor', label: 'Руководитель' },
  { value: 'seller', label: 'Продавец' },
  { value: 'technologist', label: 'Технолог' },
  { value: 'cutter', label: 'Раскройщик' },
  { value: 'ironing', label: 'Утюжка' },
  { value: 'customer', label: 'Заказчик' },
]

/** Standard size grids for product creation */
export const STANDARD_SIZE_GRIDS: { label: string; sizes: string[] }[] = [
  { label: 'S/M/L/XL', sizes: ['S', 'M', 'L', 'XL'] },
  { label: 'XS-3XL', sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'] },
  { label: '42-52 (чётные)', sizes: ['42', '44', '46', '48', '50', '52'] },
  { label: '42-56 (чётные)', sizes: ['42', '44', '46', '48', '50', '52', '54', '56'] },
  { label: '80-92', sizes: ['80', '86', '92'] },
  { label: '80-110', sizes: ['80', '86', '92', '98', '104', '110'] },
  { label: '104-128', sizes: ['104', '110', '116', '122', '128'] },
  { label: 'ONE SIZE', sizes: ['ONE SIZE'] },
]

/** Standard color presets for product creation */
export const STANDARD_COLORS: { color: string; hex: string }[] = [
  { color: 'чёрный', hex: '#1a1a1a' },
  { color: 'белый', hex: '#ffffff' },
  { color: 'тёмно-синий', hex: '#1e3a5f' },
  { color: 'серый', hex: '#808080' },
  { color: 'бежевый', hex: '#d4b896' },
  { color: 'красный', hex: '#dc2626' },
  { color: 'зелёный', hex: '#16a34a' },
  { color: 'коричневый', hex: '#7c5835' },
  { color: 'розовый', hex: '#f472b6' },
  { color: 'голубой', hex: '#38bdf8' },
  { color: 'бордовый', hex: '#7f1d1d' },
  { color: 'молочный', hex: '#faf5e4' },
]

/** Default ironing rate per unit (₽) */
export const DEFAULT_IRONING_RATE = 10
