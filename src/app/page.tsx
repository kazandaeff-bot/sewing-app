'use client'

// Force dynamic rendering to prevent CDN caching of stale HTML
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useAuth } from '@/components/auth-provider'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Loader2 } from 'lucide-react'
import { getRoleLabel } from '@/lib/formatters'
import { cn } from '@/lib/utils'

// Tab components — extracted to separate files
import { SewerTab } from '@/components/tabs/sewer-tab'
import { QCTab } from '@/components/tabs/qc-tab'
import { IroningTab } from '@/components/tabs/ironing-tab'
import { CustomerMaterialsTab } from '@/components/tabs/customer-materials-tab'
import { EmployeesTab } from '@/components/tabs/employees-tab'
import { ProductsTab } from '@/components/tabs/products-tab'
import { SewingPlansTab } from '@/components/tabs/sewing-plans-tab'
import { CuttingPlansTab } from '@/components/tabs/cutting-plans-tab'
import { CuttingLeftoversTab } from '@/components/tabs/cutting-leftovers-tab'
import { SewingTasksTab } from '@/components/tabs/sewing-tasks-tab'
import { CityDistributionTab } from '@/components/tabs/city-distribution-tab'
import { BoxesTab } from '@/components/tabs/boxes-tab'
import { ReferencesTab } from '@/components/tabs/references-tab'
import { InvoicesTab } from '@/components/tabs/invoices-tab'
import { UPDTab } from '@/components/tabs/upd-tab'
import { CRMTab } from '@/components/tabs/crm-tab'
import { ContractsTab } from '@/components/tabs/contracts-tab'

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

// ---- Sidebar navigation component ----
function Sidebar({
  items,
  activeId,
  onSelect,
  collapsed,
  onToggleCollapse,
  userName,
  userRole,
  onLogout,
}: {
  items: MenuItem[]
  activeId: string
  onSelect: (id: string) => void
  collapsed: boolean
  onToggleCollapse: () => void
  userName: string
  userRole: string
  onLogout: () => void
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

  return (
    <div
      className={cn(
        'flex flex-col h-screen bg-white border-r border-gray-200 transition-all duration-300 shrink-0',
        collapsed ? 'w-[62px]' : 'w-[240px]'
      )}
    >
      {/* Logo / App title */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
        <div className="bg-emerald-600 text-white rounded-lg p-2 shrink-0">
          <Scissors className="h-5 w-5" />
        </div>
        {!collapsed && (
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
              collapsed={collapsed}
            />
          ))}

          {groupOrder.map((groupName) => {
            if (!groups[groupName]) return null
            return (
              <div key={groupName}>
                {!collapsed && (
                  <div className="px-3 pt-4 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    {groupName}
                  </div>
                )}
                {collapsed && <div className="my-2"><Separator className="mx-2" /></div>}
                {groups[groupName].map((item) => (
                  <SidebarItem
                    key={item.id}
                    item={item}
                    active={activeId === item.id}
                    onSelect={onSelect}
                    collapsed={collapsed}
                  />
                ))}
              </div>
            )
          })}
        </nav>
      </ScrollArea>

      {/* Bottom section: user + collapse */}
      <div className="border-t border-gray-100 p-2 space-y-1">
        {!collapsed && (
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
          onClick={onLogout}
          className={cn(
            'flex items-center gap-3 w-full rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors',
            collapsed ? 'justify-center px-0 py-2' : 'px-3 py-2'
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="text-sm">Выйти</span>}
        </button>
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
      </div>
    </div>
  )
}

function SidebarItem({
  item,
  active,
  onSelect,
  collapsed,
}: {
  item: MenuItem
  active: boolean
  onSelect: (id: string) => void
  collapsed: boolean
}) {
  const Icon = item.icon
  return (
    <button
      onClick={() => onSelect(item.id)}
      className={cn(
        'flex items-center gap-3 w-full rounded-lg transition-colors text-sm',
        collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5',
        active
          ? 'bg-emerald-50 text-emerald-700 font-medium'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      )}
      title={collapsed ? item.label : undefined}
    >
      <Icon className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-emerald-600' : 'text-gray-400')} />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </button>
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

  const handleLogout = async () => { await logout(); router.push('/login') }

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div><h1 className="text-2xl font-bold text-gray-900">{user.name}</h1><p className="text-sm text-muted-foreground">{getRoleLabel(userRole)}</p></div>
            <Button variant="outline" onClick={handleLogout}><LogOut className="h-4 w-4 mr-2" />Выйти</Button>
          </div>
          <Card className="border-dashed"><CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground"><Store className="h-16 w-16 mb-4 opacity-20" /><p className="text-lg font-medium">Ваш раздел — Производство</p><p className="text-sm mt-1 mb-4">Перейдите в раздел Производство для работы</p><Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { router.push('/') }}><Factory className="h-4 w-4 mr-2" />Производство →</Button></CardContent></Card>
        </div>
      </div>
    )
  }

  // Technologist, Cutter: stub
  if (userRole === 'technologist' || userRole === 'cutter') {
    const RoleIcon = userRole === 'technologist' ? FlaskConical : Scissors
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div><h1 className="text-2xl font-bold text-gray-900">{user.name}</h1><p className="text-sm text-muted-foreground">{getRoleLabel(userRole)}</p></div>
            <Button variant="outline" onClick={handleLogout}><LogOut className="h-4 w-4 mr-2" />Выйти</Button>
          </div>
          <Card className="border-dashed"><CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground"><RoleIcon className="h-16 w-16 mb-4 opacity-20" /><p className="text-lg font-medium">Раздел в разработке</p><p className="text-sm mt-1">Данный раздел будет доступен позже</p></CardContent></Card>
        </div>
      </div>
    )
  }

  // ---- Single-tab roles with minimal sidebar ----

  // Ironing
  if (userRole === 'ironing') {
    return (
      <div className="flex h-screen">
        <Sidebar
          items={[{ id: 'ironing', label: 'ВТО', icon: Heater }]}
          activeId="ironing"
          onSelect={() => {}}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          userName={user.name}
          userRole={userRole}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-y-auto bg-gray-50/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <IroningTab />
          </div>
        </main>
      </div>
    )
  }

  // Sewer
  if (userRole === 'sewer') {
    return (
      <div className="flex h-screen">
        <Sidebar
          items={[{ id: 'sewers', label: 'Швеи', icon: Scissors }]}
          activeId="sewers"
          onSelect={() => {}}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          userName={user.name}
          userRole={userRole}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-y-auto bg-gray-50/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <SewerTab preselectedEmployeeId={user.id} />
          </div>
        </main>
      </div>
    )
  }

  // QC
  if (userRole === 'qc') {
    return (
      <div className="flex h-screen">
        <Sidebar
          items={[{ id: 'qc', label: 'ОТК', icon: ClipboardCheck }]}
          activeId="qc"
          onSelect={() => {}}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          userName={user.name}
          userRole={userRole}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-y-auto bg-gray-50/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <QCTab />
          </div>
        </main>
      </div>
    )
  }

  // ---- Multi-tab roles with full sidebar ----

  // Customer
  if (userRole === 'customer') {
    const renderContent = () => {
      switch (activeSection) {
        case 'plans': return <SewingPlansTab />
        case 'distribution': return <CityDistributionTab />
        case 'boxes': return <BoxesTab />
        case 'materials': return <CustomerMaterialsTab customerId={user.customerId!} />
        default: return <SewingPlansTab />
      }
    }

    return (
      <div className="flex h-screen">
        <Sidebar
          items={CUSTOMER_MENU}
          activeId={activeSection}
          onSelect={setActiveSection}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          userName={user.name}
          userRole={userRole}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-y-auto bg-gray-50/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {renderContent()}
          </div>
        </main>
      </div>
    )
  }

  // Supervisor: full menu with all sections
  const renderContent = () => {
    switch (activeSection) {
      case 'plans': return <SewingPlansTab />
      case 'cutting': return <CuttingPlansTab />
      case 'leftovers': return <CuttingLeftoversTab />
      case 'sewing-tasks': return <SewingTasksTab />
      case 'sewers': return <SewerTab />
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
      default: return <SewingPlansTab />
    }
  }

  return (
    <div className="flex h-screen">
      <Sidebar
        items={SUPERVISOR_MENU}
        activeId={activeSection}
        onSelect={setActiveSection}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        userName={user.name}
        userRole={userRole}
        onLogout={handleLogout}
      />
      <main className="flex-1 overflow-y-auto bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {renderContent()}
        </div>
      </main>
    </div>
  )
}
