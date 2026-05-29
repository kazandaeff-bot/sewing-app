// ============ Shared Status Badge Components ============
import { Badge } from '@/components/ui/badge'

export function getColorDot(colorHex: string) {
  return (
    <span
      style={{ backgroundColor: colorHex || '#9ca3af' }}
      className="inline-block w-3 h-3 rounded-full mr-1.5 align-middle border border-gray-200"
    />
  )
}

export function getStatusBadge(status: string) {
  switch (status) {
    case 'new':
      return <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-100">Новое</Badge>
    case 'in_progress':
      return <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">В работе</Badge>
    case 'pending_qc':
      return <Badge variant="secondary" className="bg-sky-100 text-sky-700 hover:bg-sky-100">На проверке ОТК</Badge>
    case 'completed':
      return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Принято ОТК</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

export function getReworkStatusBadge(status: string) {
  switch (status) {
    case 'pending':
      return <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">Ожидает</Badge>
    case 'in_progress':
      return <Badge variant="secondary" className="bg-sky-100 text-sky-700 hover:bg-sky-100">В работе</Badge>
    case 'pending_qc':
      return <Badge variant="secondary" className="bg-purple-100 text-purple-700 hover:bg-purple-100">На проверке ОТК</Badge>
    case 'completed':
      return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Завершено</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

export function getItemStatusBadge(status: string) {
  switch (status) {
    case 'issued':
      return <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-100 text-xs">Выдано</Badge>
    case 'in_work':
      return <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-xs">В работе</Badge>
    case 'pending_ironing':
      return <Badge variant="secondary" className="bg-purple-100 text-purple-700 hover:bg-purple-100 text-xs">На ВТО</Badge>
    case 'ironed':
      return <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 text-xs">Отглажено</Badge>
    case 'pending_qc':
      return <Badge variant="secondary" className="bg-sky-100 text-sky-700 hover:bg-sky-100 text-xs">На ОТК</Badge>
    case 'completed':
      return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-xs">Готово</Badge>
    default:
      return <Badge variant="secondary" className="text-xs">{status}</Badge>
  }
}

export function getPlanStatusBadge(status: string) {
  switch (status) {
    case 'draft':
      return <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-100">Черновик</Badge>
    case 'approved':
      return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Утверждён</Badge>
    case 'in_work':
      return <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">В работе</Badge>
    case 'shipped':
      return <Badge variant="secondary" className="bg-sky-100 text-sky-700 hover:bg-sky-100">Отгружен</Badge>
    case 'shipped_paid':
      return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 font-bold">Отгружен и оплачен</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

export function getCuttingStatusBadge(status: string) {
  switch (status) {
    case 'in_work':
      return <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">В работе</Badge>
    case 'cut':
      return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Раскроено</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

export function getSewingTaskStatusBadge(status: string) {
  switch (status) {
    case 'issued':
      return <Badge variant="secondary" className="bg-sky-100 text-sky-700 hover:bg-sky-100">Выдано</Badge>
    case 'in_work':
      return <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">В работе</Badge>
    case 'done':
      return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Готово</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

export function getBoxStatusBadge(status: string) {
  switch (status) {
    case 'forming':
      return <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-100">Формируется</Badge>
    case 'assembled':
      return <Badge variant="secondary" className="bg-sky-100 text-sky-700 hover:bg-sky-100">Собран</Badge>
    case 'checked':
      return <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">Проверен</Badge>
    case 'shipped':
      return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Отгружён</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}
