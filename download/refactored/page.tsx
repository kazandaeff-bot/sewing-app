'use client'

import { useAuth } from '@/components/auth-provider'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Scissors,
  ClipboardCheck,
  ListTodo,
  Loader2,
  LogOut,
  Package,
  Users,
  Factory,
  Store,
  FlaskConical,
  Heater,
} from 'lucide-react'
import {
  SewingPlansTab,
  CuttingPlansTab,
  SewingTasksTab,
  CityDistributionTab,
  BoxesTab,
  ReferencesTab,
  StubTab,
} from '@/components/production-tabs'
import { SewerTab } from '@/components/tabs/sewer-tab'
import { QCTab } from '@/components/tabs/qc-tab'
import { TasksTab, EmployeesTab, ProductsTab } from '@/components/tabs/supervisor-tab'
import { getRoleLabel } from '@/lib/helpers'

// ============ MAIN PAGE ============
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
              onClick={() => router.push('/production')}
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
          <Card className="border-dashed"><CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground"><Store className="h-16 w-16 mb-4 opacity-20" /><p className="text-lg font-medium">Ваш раздел — Производство</p><p className="text-sm mt-1 mb-4">Перейдите в раздел Производство для работы</p><Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { router.push('/production') }}><Factory className="h-4 w-4 mr-2" />Производство →</Button></CardContent></Card>
        </div>
      </div>
    )
  }

  // Technologist, Cutter, Ironing: stub
  if (userRole === 'technologist' || userRole === 'cutter' || userRole === 'ironing') {
    const RoleIcon = userRole === 'technologist' ? FlaskConical : userRole === 'cutter' ? Scissors : Heater
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

  // Supervisor: all tabs
  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div><h1 className="text-2xl font-bold text-gray-900">{user.name}</h1><p className="text-sm text-muted-foreground">{getRoleLabel(userRole)}</p></div>
          <div className="flex items-center gap-2">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { router.push('/production') }}><Factory className="h-4 w-4 mr-2" />Производство →</Button>
            <Button variant="outline" onClick={handleLogout}><LogOut className="h-4 w-4 mr-2" />Выйти</Button>
          </div>
        </div>
        <Tabs defaultValue="sewers" className="w-full">
          <TabsList className="w-full sm:w-auto flex flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="sewers" className="gap-1.5"><Scissors className="h-4 w-4" /><span className="hidden sm:inline">Швеи</span><span className="sm:hidden">Швеи</span></TabsTrigger>
            <TabsTrigger value="qc" className="gap-1.5"><ClipboardCheck className="h-4 w-4" /><span className="hidden sm:inline">ОТК</span><span className="sm:hidden">ОТК</span></TabsTrigger>
            <TabsTrigger value="tasks" className="gap-1.5"><ListTodo className="h-4 w-4" /><span className="hidden sm:inline">Задания</span><span className="sm:hidden">Задания</span></TabsTrigger>
            <TabsTrigger value="products" className="gap-1.5"><Package className="h-4 w-4" /><span className="hidden sm:inline">Изделия</span><span className="sm:hidden">Изделия</span></TabsTrigger>
            <TabsTrigger value="employees" className="gap-1.5"><Users className="h-4 w-4" /><span className="hidden sm:inline">Сотрудники</span><span className="sm:hidden">Сотрудники</span></TabsTrigger>
          </TabsList>
          <TabsContent value="sewers" className="mt-6"><SewerTab /></TabsContent>
          <TabsContent value="qc" className="mt-6"><QCTab /></TabsContent>
          <TabsContent value="tasks" className="mt-6"><TasksTab /></TabsContent>
          <TabsContent value="products" className="mt-6"><ProductsTab /></TabsContent>
          <TabsContent value="employees" className="mt-6"><EmployeesTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
