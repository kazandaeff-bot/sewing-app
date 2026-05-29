'use client'

// Force dynamic rendering to prevent CDN caching of stale HTML
export const dynamic = 'force-dynamic'

import { useAuth } from '@/components/auth-provider'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { getRoleLabel } from '@/lib/formatters'

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

// Icons used in HomePage layout
import {
  Scissors,
  ClipboardCheck,
  ListTodo,
  Plus,
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
} from 'lucide-react'

export default function HomePage() {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const userRole = user?.role || ''

  if (loading) {
    return (<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /><span className="ml-3 text-muted-foreground">Загрузка...</span></div>)
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

  const handleLogout = async () => { await logout(); router.push('/login') }

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

  // Ironing: dedicated IroningTab
  if (userRole === 'ironing') {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div><h1 className="text-2xl font-bold text-gray-900">{user.name}</h1><p className="text-sm text-muted-foreground">{getRoleLabel(userRole)}</p></div>
            <Button variant="outline" onClick={handleLogout}><LogOut className="h-4 w-4 mr-2" />Выйти</Button>
          </div>
          <IroningTab />
        </div>
      </div>
    )
  }

  // Sewer: only SewerTab
  if (userRole === 'sewer') {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div><h1 className="text-2xl font-bold text-gray-900">{user.name}</h1><p className="text-sm text-muted-foreground">{getRoleLabel(userRole)}</p></div>
            <Button variant="outline" onClick={handleLogout}><LogOut className="h-4 w-4 mr-2" />Выйти</Button>
          </div>
          <SewerTab preselectedEmployeeId={user.id} />
        </div>
      </div>
    )
  }

  // QC: only QCTab
  if (userRole === 'qc') {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div><h1 className="text-2xl font-bold text-gray-900">{user.name}</h1><p className="text-sm text-muted-foreground">{getRoleLabel(userRole)}</p></div>
            <Button variant="outline" onClick={handleLogout}><LogOut className="h-4 w-4 mr-2" />Выйти</Button>
          </div>
          <QCTab />
        </div>
      </div>
    )
  }

  // Customer: only their own plans, cities, and boxes
  if (userRole === 'customer') {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
              <p className="text-sm text-muted-foreground">Личный кабинет заказчика</p>
            </div>
            <Button variant="outline" onClick={handleLogout}><LogOut className="h-4 w-4 mr-2" />Выйти</Button>
          </div>
          <Tabs defaultValue="plans" className="w-full">
            <TabsList className="w-full sm:w-auto flex flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="plans" className="gap-1.5"><FileText className="h-4 w-4" /><span className="hidden sm:inline">Планы пошива</span><span className="sm:hidden">Планы</span></TabsTrigger>
              <TabsTrigger value="distribution" className="gap-1.5"><MapPin className="h-4 w-4" /><span className="hidden sm:inline">Города</span><span className="sm:hidden">Города</span></TabsTrigger>
              <TabsTrigger value="boxes" className="gap-1.5"><Box className="h-4 w-4" /><span className="hidden sm:inline">Короба</span><span className="sm:hidden">Короба</span></TabsTrigger>
              <TabsTrigger value="materials" className="gap-1.5"><Package className="h-4 w-4" /><span className="hidden sm:inline">Материалы</span><span className="sm:hidden">Мат.</span></TabsTrigger>
            </TabsList>
            <TabsContent value="plans" className="mt-6"><SewingPlansTab /></TabsContent>
            <TabsContent value="distribution" className="mt-6"><CityDistributionTab /></TabsContent>
            <TabsContent value="boxes" className="mt-6"><BoxesTab /></TabsContent>
            <TabsContent value="materials" className="mt-6"><CustomerMaterialsTab customerId={user.customerId!} /></TabsContent>
          </Tabs>
        </div>
      </div>
    )
  }

  // Supervisor: all tabs including production management
  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div><h1 className="text-2xl font-bold text-gray-900">{user.name}</h1><p className="text-sm text-muted-foreground">{getRoleLabel(userRole)}</p></div>
          <Button variant="outline" onClick={handleLogout}><LogOut className="h-4 w-4 mr-2" />Выйти</Button>
        </div>
        <Tabs defaultValue="plans" className="w-full">
          <TabsList className="w-full sm:w-auto flex flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="plans" className="gap-1.5"><FileText className="h-4 w-4" /><span className="hidden sm:inline">Планы пошива</span><span className="sm:hidden">Планы</span></TabsTrigger>
            <TabsTrigger value="cutting" className="gap-1.5"><Scissors className="h-4 w-4" /><span className="hidden sm:inline">Раскрой</span><span className="sm:hidden">Раскрой</span></TabsTrigger>
            <TabsTrigger value="leftovers" className="gap-1.5"><AlertTriangle className="h-4 w-4" /><span className="hidden sm:inline">Остатки</span><span className="sm:hidden">Остатки</span></TabsTrigger>
            <TabsTrigger value="sewing-tasks" className="gap-1.5"><ListTodo className="h-4 w-4" /><span className="hidden sm:inline">Задания швеям</span><span className="sm:hidden">Задания</span></TabsTrigger>
            <TabsTrigger value="sewers" className="gap-1.5"><Scissors className="h-4 w-4" /><span className="hidden sm:inline">Швеи</span><span className="sm:hidden">Швеи</span></TabsTrigger>
            <TabsTrigger value="qc" className="gap-1.5"><ClipboardCheck className="h-4 w-4" /><span className="hidden sm:inline">ОТК</span><span className="sm:hidden">ОТК</span></TabsTrigger>
            <TabsTrigger value="ironing" className="gap-1.5"><Heater className="h-4 w-4" /><span className="hidden sm:inline">ВТО</span><span className="sm:hidden">ВТО</span></TabsTrigger>
            <TabsTrigger value="distribution" className="gap-1.5"><MapPin className="h-4 w-4" /><span className="hidden sm:inline">Города</span><span className="sm:hidden">Города</span></TabsTrigger>
            <TabsTrigger value="boxes" className="gap-1.5"><Box className="h-4 w-4" /><span className="hidden sm:inline">Короба</span><span className="sm:hidden">Короба</span></TabsTrigger>
            <TabsTrigger value="products" className="gap-1.5"><Package className="h-4 w-4" /><span className="hidden sm:inline">Изделия</span><span className="sm:hidden">Изделия</span></TabsTrigger>
            <TabsTrigger value="employees" className="gap-1.5"><Users className="h-4 w-4" /><span className="hidden sm:inline">Сотрудники</span><span className="sm:hidden">Сотрудники</span></TabsTrigger>
            <TabsTrigger value="references" className="gap-1.5"><BookOpen className="h-4 w-4" /><span className="hidden sm:inline">Справочники</span><span className="sm:hidden">Справ.</span></TabsTrigger>
          </TabsList>
          <TabsContent value="plans" className="mt-6"><SewingPlansTab /></TabsContent>
          <TabsContent value="cutting" className="mt-6"><CuttingPlansTab /></TabsContent>
          <TabsContent value="leftovers" className="mt-6"><CuttingLeftoversTab /></TabsContent>
          <TabsContent value="sewing-tasks" className="mt-6"><SewingTasksTab /></TabsContent>
          <TabsContent value="sewers" className="mt-6"><SewerTab /></TabsContent>
          <TabsContent value="qc" className="mt-6"><QCTab /></TabsContent>
          <TabsContent value="ironing" className="mt-6"><IroningTab /></TabsContent>
          <TabsContent value="distribution" className="mt-6"><CityDistributionTab /></TabsContent>
          <TabsContent value="boxes" className="mt-6"><BoxesTab /></TabsContent>
          <TabsContent value="products" className="mt-6"><ProductsTab /></TabsContent>
          <TabsContent value="employees" className="mt-6"><EmployeesTab /></TabsContent>
          <TabsContent value="references" className="mt-6"><ReferencesTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
