'use client'

import { useState, lazy, Suspense } from 'react'
import { useAuth, getAuthHeaders } from '@/components/auth-provider'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { getRoleLabel } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'

// Tab components — lazy loaded to reduce SSR memory usage
const SewerTab = lazy(() => import('@/components/tabs/sewer-tab').then(m => ({ default: m.SewerTab })))
const QCTab = lazy(() => import('@/components/tabs/qc-tab').then(m => ({ default: m.QCTab })))
const IroningTab = lazy(() => import('@/components/tabs/ironing-tab').then(m => ({ default: m.IroningTab })))
const CustomerMaterialsTab = lazy(() => import('@/components/tabs/customer-materials-tab').then(m => ({ default: m.CustomerMaterialsTab })))
const EmployeesTab = lazy(() => import('@/components/tabs/employees-tab').then(m => ({ default: m.EmployeesTab })))
const ProductsTab = lazy(() => import('@/components/tabs/products-tab').then(m => ({ default: m.ProductsTab })))
const SewingPlansTab = lazy(() => import('@/components/tabs/sewing-plans-tab').then(m => ({ default: m.SewingPlansTab })))
const CuttingPlansTab = lazy(() => import('@/components/tabs/cutting-plans-tab').then(m => ({ default: m.CuttingPlansTab })))
const CuttingLeftoversTab = lazy(() => import('@/components/tabs/cutting-leftovers-tab').then(m => ({ default: m.CuttingLeftoversTab })))
const SewingTasksTab = lazy(() => import('@/components/tabs/sewing-tasks-tab').then(m => ({ default: m.SewingTasksTab })))
const CityDistributionTab = lazy(() => import('@/components/tabs/city-distribution-tab').then(m => ({ default: m.CityDistributionTab })))
const BoxesTab = lazy(() => import('@/components/tabs/boxes-tab').then(m => ({ default: m.BoxesTab })))
const ReferencesTab = lazy(() => import('@/components/tabs/references-tab').then(m => ({ default: m.ReferencesTab })))
const InvoicesTab = lazy(() => import('@/components/tabs/invoices-tab').then(m => ({ default: m.InvoicesTab })))
const UPDTab = lazy(() => import('@/components/tabs/upd-tab').then(m => ({ default: m.UPDTab })))
const CRMTab = lazy(() => import('@/components/tabs/crm-tab').then(m => ({ default: m.CRMTab })))
const ContractsTab = lazy(() => import('@/components/tabs/contracts-tab').then(m => ({ default: m.ContractsTab })))

// Loading fallback for lazy tabs
function TabLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      <span className="ml-2 text-muted-foreground">Загрузка...</span>
    </div>
  )
}

// Icons
import {
  Scissors,
  ClipboardCheck,
  ListTodo,
  LogOut,
  Factory,
  MapPin,
  Users,
  Package,
  BookOpen,
  Heater,
  FileText,
  AlertTriangle,
  FlaskConical,
  Store,
  Box,
  ChevronLeft,
  ChevronRight,
  Receipt,
  FileSpreadsheet,
  Handshake,
  ScrollText,
  KeyRound,
  Menu,
} from 'lucide-react'

import type { LucideIcon } from 'lucide-react'

// ---- Sidebar menu item type ----
interface MenuItem {
  id: string
  label: string
  shortLabel?: string
  icon: LucideIcon
  group?: string
}

// ---- Sidebar navigation component (desktop) ----
function SidebarContent({
  items,
  activeId,
  onSelect,
  collapsed,
  onToggleCollapse,
  userName,
  userRole,
  onLogout,
  onChangePassword,
  isMobileSheet = false,
}: {
  items: MenuItem[]
  activeId: string
  onSelect: (id: string) => void
  collapsed: boolean
  onToggleCollapse: () => void
  userName: string
  userRole: string
  onLogout: () => void
  onChangePassword: () => void
  isMobileSheet?: boolean
}) {
  // Group items
  const groups: Record<string, MenuItem[]> = {}
  const ungrouped: MenuItem[] = []
  for (const item of items) {
    if (item.group) {
      if (!groups[item.group]) groups[item.group] = []
      groups[item.group].push(item)
    } else {
      ungrouped.push(item)
    }
  }

  const groupOrder = ['Планирование', 'Производство', 'Финансы', 'Справочники']

  // In mobile sheet, always show full labels (never collapsed)
  const showLabels = isMobileSheet || !collapsed

  return (
    <div className={cn(
      'flex flex-col h-full bg-white',
      !isMobileSheet && 'border-r border-gray-200 transition-all duration-300 shrink-0',
      !isMobileSheet && (collapsed ? 'w-[62px]' : 'w-[240px]')
    )}>
      {/* Logo / App title */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
        <div className="bg-emerald-600 text-white rounded-lg p-2 shrink-0">
          <Scissors className="h-5 w-5" />
        </div>
        {showLabels && (
          <div className="overflow-hidden">
            <div className="text-sm font-bold text-gray-900 truncate">Швейное Производство</div>
            <div className="text-[11px] text-muted-foreground truncate">{getRoleLabel(userRole)}</div>
          </div>
        )}
      </div>

      {/* Menu items */}
      <ScrollArea className="flex-1 py-2">
        <nav className="px-2 space-y-1">
          {ungrouped.map((item) => (
            <SidebarItem
              key={item.id}
              item={item}
              active={activeId === item.id}
              onSelect={onSelect}
              showLabels={showLabels}
            />
          ))}

          {groupOrder.map((groupName) => {
            if (!groups[groupName]) return null
            return (
              <div key={groupName}>
                {showLabels && (
                  <div className="px-3 pt-4 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    {groupName}
                  </div>
                )}
                {!showLabels && <div className="my-2"><Separator className="mx-2" /></div>}
                {groups[groupName].map((item) => (
                  <SidebarItem
                    key={item.id}
                    item={item}
                    active={activeId === item.id}
                    onSelect={onSelect}
                    showLabels={showLabels}
                  />
                ))}
              </div>
            )
          })}
        </nav>
      </ScrollArea>

      {/* Bottom section: user + collapse */}
      <div className="border-t border-gray-100 p-2 space-y-1">
        {showLabels && (
          <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-gray-50 mb-1">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden flex-1">
              <div className="text-sm font-medium text-gray-900 truncate">{userName}</div>
            </div>
          </div>
        )}
        <button
          onClick={onChangePassword}
          className={cn(
            'flex items-center gap-3 w-full rounded-lg text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors',
            showLabels ? 'px-3 py-2' : 'justify-center px-0 py-2'
          )}
        >
          <KeyRound className="h-4 w-4 shrink-0" />
          {showLabels && <span className="text-sm">Сменить пароль</span>}
        </button>
        <button
          onClick={onLogout}
          className={cn(
            'flex items-center gap-3 w-full rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors',
            showLabels ? 'px-3 py-2' : 'justify-center px-0 py-2'
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {showLabels && <span className="text-sm">Выйти</span>}
        </button>
        {!isMobileSheet && (
          <button
            onClick={onToggleCollapse}
            className={cn(
              'flex items-center gap-3 w-full rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors',
              collapsed ? 'justify-center px-0 py-2' : 'px-3 py-2'
            )}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4 shrink-0" />}
            {!collapsed && <span className="text-sm">Свернуть</span>}
          </button>
        )}
      </div>
    </div>
  )
}

function SidebarItem({
  item,
  active,
  onSelect,
  showLabels,
}: {
  item: MenuItem
  active: boolean
  onSelect: (id: string) => void
  showLabels: boolean
}) {
  const Icon = item.icon
  return (
    <button
      onClick={() => onSelect(item.id)}
      className={cn(
        'flex items-center gap-3 w-full rounded-lg transition-colors text-sm',
        showLabels ? 'px-3 py-2.5' : 'justify-center px-0 py-2.5',
        active
          ? 'bg-emerald-50 text-emerald-700 font-medium'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      )}
      title={!showLabels ? item.label : undefined}
    >
      <Icon className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-emerald-600' : 'text-gray-400')} />
      {showLabels && <span className="truncate">{item.label}</span>}
    </button>
  )
}

// ---- Mobile Header ----
function MobileHeader({
  userName,
  onMenuOpen,
  onLogout,
}: {
  userName: string
  onMenuOpen: () => void
  onLogout: () => void
}) {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between bg-white border-b border-gray-200 px-3 py-2 md:hidden">
      <button
        onClick={onMenuOpen}
        className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
        aria-label="Открыть меню"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex items-center gap-2">
        <div className="bg-emerald-600 text-white rounded-md p-1.5">
          <Scissors className="h-4 w-4" />
        </div>
        <span className="text-sm font-bold text-gray-900">Швейное Производство</span>
      </div>
      <button
        onClick={onLogout}
        className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600"
        aria-label="Выйти"
      >
        <LogOut className="h-5 w-5" />
      </button>
    </header>
  )
}

// ---- Menu definitions per role ----

const SUPERVISOR_MENU: MenuItem[] = [
  { id: 'plans', label: 'Планы пошива', icon: FileText, group: 'Планирование' },
  { id: 'cutting', label: 'Раскрой', icon: Scissors, group: 'Производство' },
  { id: 'leftovers', label: 'Остатки раскроя', icon: AlertTriangle, group: 'Производство' },
  { id: 'sewing-tasks', label: 'Задания швеям', icon: ListTodo, group: 'Производство' },
  { id: 'sewers', label: 'Работа швей', icon: Scissors, group: 'Производство' },
  { id: 'qc', label: 'ОТК', icon: ClipboardCheck, group: 'Производство' },
  { id: 'ironing', label: 'ВТО', icon: Heater, group: 'Производство' },
  { id: 'boxes', label: 'Упаковка', icon: Box, group: 'Производство' },
  { id: 'contracts', label: 'Договоры', icon: ScrollText, group: 'Финансы' },
  { id: 'invoices', label: 'Счета', icon: Receipt, group: 'Финансы' },
  { id: 'upd', label: 'УПД', icon: FileSpreadsheet, group: 'Финансы' },
  { id: 'crm', label: 'Сделки', icon: Handshake, group: 'Финансы' },
  { id: 'products', label: 'Изделия', icon: Package, group: 'Справочники' },
  { id: 'employees', label: 'Сотрудники', icon: Users, group: 'Справочники' },
  { id: 'references', label: 'Прочее', icon: BookOpen, group: 'Справочники' },
]

const CUSTOMER_MENU: MenuItem[] = [
  { id: 'plans', label: 'Планы пошива', icon: FileText, group: 'Планирование' },
  { id: 'distribution', label: 'Города', icon: MapPin, group: 'Планирование' },
  { id: 'boxes', label: 'Упаковка', icon: Box, group: 'Планирование' },
  { id: 'materials', label: 'Материалы', icon: Package, group: 'Планирование' },
]

// ---- Main page component ----
export default function HomePage() {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const userRole = user?.role || ''
  const [activeSection, setActiveSection] = useState('plans')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isMobile = useIsMobile()

  const handleLogout = async () => { await logout(); router.push('/login') }

  const handleChangePassword = () => setShowChangePassword(true)

  const handleSelect = (id: string) => {
    setActiveSection(id)
    if (isMobile) setMobileMenuOpen(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <span className="ml-3 text-muted-foreground">Загрузка...</span>
      </div>
    )
  }

  // If not logged in, show home page with login and production buttons
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-emerald-200">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto bg-emerald-600 text-white rounded-xl p-4 w-fit">
              <Scissors className="h-10 w-10" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-emerald-700">Швейное Производство</CardTitle>
              <CardDescription className="mt-2">Система управления производством</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white min-h-[48px] text-base"
              onClick={() => router.push('/')}
            >
              <Factory className="h-5 w-5 mr-2" />
              Производство
            </Button>
            <Button
              variant="outline"
              className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50 min-h-[48px] text-base"
              onClick={() => router.push('/login')}
            >
              <LogOut className="h-5 w-5 mr-2" />
              Войти в систему
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ---- Simple single-section roles (no sidebar needed) ----

  // Seller: redirect to production
  if (userRole === 'seller') {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center justify-between mb-6">
            <div><h1 className="text-xl sm:text-2xl font-bold text-gray-900">{user.name}</h1><p className="text-sm text-muted-foreground">{getRoleLabel(userRole)}</p></div>
            <Button variant="outline" onClick={handleLogout} size={isMobile ? 'sm' : 'default'}><LogOut className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Выйти</span></Button>
          </div>
          <Card className="border-dashed"><CardContent className="flex flex-col items-center justify-center py-12 sm:py-16 text-muted-foreground"><Store className="h-12 w-12 sm:h-16 sm:w-16 mb-4 opacity-20" /><p className="text-base sm:text-lg font-medium">Ваш раздел — Производство</p><p className="text-sm mt-1 mb-4">Перейдите в раздел Производство для работы</p><Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { router.push('/') }}><Factory className="h-4 w-4 mr-2" />Производство →</Button></CardContent></Card>
        </div>
      </div>
    )
  }

  // Technologist, Cutter: stub
  if (userRole === 'technologist' || userRole === 'cutter') {
    const RoleIcon = userRole === 'technologist' ? FlaskConical : Scissors
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center justify-between mb-6">
            <div><h1 className="text-xl sm:text-2xl font-bold text-gray-900">{user.name}</h1><p className="text-sm text-muted-foreground">{getRoleLabel(userRole)}</p></div>
            <Button variant="outline" onClick={handleLogout} size={isMobile ? 'sm' : 'default'}><LogOut className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Выйти</span></Button>
          </div>
          <Card className="border-dashed"><CardContent className="flex flex-col items-center justify-center py-12 sm:py-16 text-muted-foreground"><RoleIcon className="h-12 w-12 sm:h-16 sm:w-16 mb-4 opacity-20" /><p className="text-base sm:text-lg font-medium">Раздел в разработке</p><p className="text-sm mt-1">Данный раздел будет доступен позже</p></CardContent></Card>
        </div>
      </div>
    )
  }

  // ---- Roles with sidebar navigation ----

  const getSidebarItems = (): MenuItem[] => {
    if (userRole === 'customer') return CUSTOMER_MENU
    if (userRole === 'ironing') return [{ id: 'ironing', label: 'ВТО', icon: Heater }]
    if (userRole === 'sewer') return [{ id: 'sewers', label: 'Швеи', icon: Scissors }]
    if (userRole === 'qc') return [{ id: 'qc', label: 'ОТК', icon: ClipboardCheck }]
    return SUPERVISOR_MENU
  }

  const renderContent = () => {
    const tab = (
      <Suspense fallback={<TabLoader />}>
        {(() => {
          switch (activeSection) {
            case 'plans': return <SewingPlansTab />
            case 'cutting': return <CuttingPlansTab />
            case 'leftovers': return <CuttingLeftoversTab />
            case 'sewing-tasks': return <SewingTasksTab />
            case 'sewers': return <SewerTab preselectedEmployeeId={userRole === 'sewer' ? user.id : undefined} />
            case 'qc': return <QCTab />
            case 'ironing': return <IroningTab />
            case 'distribution': return <CityDistributionTab />
            case 'boxes': return <BoxesTab />
            case 'products': return <ProductsTab />
            case 'employees': return <EmployeesTab />
            case 'references': return <ReferencesTab />
            case 'contracts': return <ContractsTab />
            case 'invoices': return <InvoicesTab />
            case 'upd': return <UPDTab />
            case 'crm': return <CRMTab />
            case 'materials': return <CustomerMaterialsTab customerId={user.customerId!} />
            default: return <SewingPlansTab />
          }
        })()}
      </Suspense>
    )
    return tab
  }

  const sidebarItems = getSidebarItems()

  // ---- Mobile Layout ----
  if (isMobile) {
    return (
      <div className="flex flex-col h-screen bg-gray-50/50">
        <MobileHeader
          userName={user.name}
          onMenuOpen={() => setMobileMenuOpen(true)}
          onLogout={handleLogout}
        />

        {/* Mobile Sidebar Sheet */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="w-[280px] p-0">
            <SheetTitle className="sr-only">Навигация</SheetTitle>
            <SidebarContent
              items={sidebarItems}
              activeId={activeSection}
              onSelect={handleSelect}
              collapsed={false}
              onToggleCollapse={() => {}}
              userName={user.name}
              userRole={userRole}
              onLogout={handleLogout}
              onChangePassword={handleChangePassword}
              isMobileSheet={true}
            />
          </SheetContent>
        </Sheet>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="px-3 py-4">
            {renderContent()}
          </div>
        </main>

        <ChangePasswordDialog open={showChangePassword} onOpenChange={setShowChangePassword} />
      </div>
    )
  }

  // ---- Desktop Layout ----
  return (
    <div className="flex h-screen">
      <SidebarContent
        items={sidebarItems}
        activeId={activeSection}
        onSelect={handleSelect}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        userName={user.name}
        userRole={userRole}
        onLogout={handleLogout}
        onChangePassword={handleChangePassword}
      />
      <main className="flex-1 overflow-y-auto bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {renderContent()}
        </div>
      </main>
      <ChangePasswordDialog open={showChangePassword} onOpenChange={setShowChangePassword} />
    </div>
  )
}

// ---- Change Password Dialog ----
function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (newPassword.length < 6) {
      setError('Новый пароль должен содержать минимум 6 символов')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Пароли не совпадают')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ currentPassword, newPassword }),
        credentials: 'include',
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess(true)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setTimeout(() => onOpenChange(false), 1500)
      } else {
        setError(data.error || 'Ошибка смены пароля')
      }
    } catch {
      setError('Ошибка подключения')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-w-[calc(100%-2rem)]">
        <DialogHeader>
          <DialogTitle>Сменить пароль</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Текущий пароль</Label>
            <Input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">Новый пароль</Label>
            <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Подтвердите новый пароль</Label>
            <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-md p-3 text-sm">{error}</div>}
          {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-md p-3 text-sm">Пароль успешно изменён!</div>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Сменить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
