'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import {
  Plus,
  Loader2,
  RotateCcw,
  Users,
  Package,
  Pencil,
  Trash2,
  X,
} from 'lucide-react'
import { type Employee, type TaskWithRelations, type Product, type ReworkReason, EMPLOYEE_ROLES } from '@/types'
import { getColorDot, getStatusBadge, getRoleLabel } from '@/lib/helpers'

// ============ TAB 3: ЗАДАНИЯ ============
export function TasksTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null)

  // Create form state
  const [newEmployeeId, setNewEmployeeId] = useState('')
  const [newProductId, setNewProductId] = useState('')
  const [newSize, setNewSize] = useState('')
  const [newColor, setNewColor] = useState('')
  const [newColorHex, setNewColorHex] = useState('#9ca3af')
  const [newQuantity, setNewQuantity] = useState('')

  // Edit form state
  const [editEmployeeId, setEditEmployeeId] = useState('')
  const [editProductId, setEditProductId] = useState('')
  const [editSize, setEditSize] = useState('')
  const [editColor, setEditColor] = useState('')
  const [editColorHex, setEditColorHex] = useState('#9ca3af')
  const [editQuantity, setEditQuantity] = useState('')

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => fetch('/api/employees').then((r) => r.json()),
  })

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => fetch('/api/products').then((r) => r.json()),
  })

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', 'all', statusFilter],
    queryFn: () => {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : ''
      return fetch(`/api/tasks${params}`).then((r) => r.json())
    },
  })

  const createTaskMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setCreateOpen(false)
      setNewEmployeeId('')
      setNewProductId('')
      setNewSize('')
      setNewColor('')
      setNewColorHex('#9ca3af')
      setNewQuantity('')
      toast({ title: 'Задание создано', description: 'Новое задание добавлено' })
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось создать задание', variant: 'destructive' })
    },
  })

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setEditOpen(false)
      toast({ title: 'Задание обновлено', description: 'Изменения сохранены' })
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось обновить задание', variant: 'destructive' })
    },
  })

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/tasks/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setDeleteOpen(false)
      setSelectedTask(null)
      toast({ title: 'Задание удалено', description: 'Задание успешно удалено' })
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось удалить задание', variant: 'destructive' })
    },
  })

  const handleCreate = useCallback(() => {
    if (!newEmployeeId || !newProductId || !newSize || !newColor || !newQuantity) return
    createTaskMutation.mutate({
      employeeId: newEmployeeId,
      productId: newProductId,
      size: newSize,
      color: newColor,
      colorHex: newColorHex,
      quantity: newQuantity,
    })
  }, [newEmployeeId, newProductId, newSize, newColor, newColorHex, newQuantity, createTaskMutation])

  const handleOpenEdit = useCallback((task: TaskWithRelations) => {
    setSelectedTask(task)
    setEditEmployeeId(task.employeeId)
    setEditProductId(task.productId)
    setEditSize(task.size)
    setEditColor(task.color)
    setEditColorHex(task.colorHex)
    setEditQuantity(String(task.quantity))
    setEditOpen(true)
  }, [])

  const handleEdit = useCallback(() => {
    if (!selectedTask) return
    updateTaskMutation.mutate({
      id: selectedTask.id,
      data: {
        employeeId: editEmployeeId,
        productId: editProductId,
        size: editSize,
        color: editColor,
        colorHex: editColorHex,
        quantity: editQuantity,
      },
    })
  }, [selectedTask, editEmployeeId, editProductId, editSize, editColor, editColorHex, editQuantity, updateTaskMutation])

  const handleOpenDelete = useCallback((task: TaskWithRelations) => {
    setSelectedTask(task)
    setDeleteOpen(true)
  }, [])

  const sewers = employees.filter((e: Employee) => e.role === 'sewer')

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="new">Новое</SelectItem>
              <SelectItem value="in_progress">В работе</SelectItem>
              <SelectItem value="pending_qc">На проверке ОТК</SelectItem>
              <SelectItem value="completed">Принято</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px]"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Новое задание
        </Button>
      </div>

      {tasksLoading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        </div>
      ) : tasks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            Нет заданий
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task: TaskWithRelations) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{task.product.name}</CardTitle>
                    <CardDescription className="text-xs">{task.product.article}</CardDescription>
                  </div>
                  {getStatusBadge(task.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Швея:</span>{' '}
                  <span className="font-medium">{task.employee.name}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs">
                    Размер: {task.size}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {getColorDot(task.colorHex)}
                    {task.color}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-xs text-muted-foreground">План</div>
                    <div className="font-semibold">{task.quantity}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Факт</div>
                    <div className="font-semibold">{task.actualQuantity ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Брак</div>
                    <div className={`font-semibold ${task.fabricDefect > 0 ? 'text-red-600' : ''}`}>
                      {task.fabricDefect}
                    </div>
                  </div>
                </div>
                {task.reworks.length > 0 && (
                  <div className="flex items-center gap-1 text-orange-600 text-xs">
                    <RotateCcw className="h-3 w-3" />
                    Переделок: {task.reworks.length}
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 min-h-[44px]"
                    onClick={() => handleOpenEdit(task)}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Изменить
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-300 text-red-600 hover:bg-red-50 min-h-[44px]"
                    onClick={() => handleOpenDelete(task)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Task Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Новое задание</DialogTitle>
            <DialogDescription>Создайте задание для швеи</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Швея</Label>
              <Select value={newEmployeeId} onValueChange={setNewEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="-- Выберите швею --" />
                </SelectTrigger>
                <SelectContent>
                  {sewers.map((e: Employee) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} ({e.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Изделие</Label>
              <Select value={newProductId} onValueChange={setNewProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="-- Выберите изделие --" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p: Product) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.article})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Размер</Label>
                <Input value={newSize} onChange={(e) => setNewSize(e.target.value)} placeholder="46" />
              </div>
              <div className="space-y-2">
                <Label>Количество</Label>
                <Input type="number" value={newQuantity} onChange={(e) => setNewQuantity(e.target.value)} placeholder="10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Цвет</Label>
              <div className="flex gap-2 items-center">
                <Input value={newColor} onChange={(e) => setNewColor(e.target.value)} placeholder="синий" className="flex-1" />
                <input
                  type="color"
                  value={newColorHex}
                  onChange={(e) => setNewColorHex(e.target.value)}
                  className="w-10 h-10 rounded border cursor-pointer"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Отмена</Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleCreate}
                disabled={createTaskMutation.isPending || !newEmployeeId || !newProductId || !newSize || !newColor || !newQuantity}
              >
                {createTaskMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Plus className="h-4 w-4 mr-1" />
                Создать
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Редактировать задание</DialogTitle>
            <DialogDescription>Измените параметры задания</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Швея</Label>
              <Select value={editEmployeeId} onValueChange={setEditEmployeeId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sewers.map((e: Employee) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} ({e.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Изделие</Label>
              <Select value={editProductId} onValueChange={setEditProductId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p: Product) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.article})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Размер</Label>
                <Input value={editSize} onChange={(e) => setEditSize(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Количество</Label>
                <Input type="number" value={editQuantity} onChange={(e) => setEditQuantity(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Цвет</Label>
              <div className="flex gap-2 items-center">
                <Input value={editColor} onChange={(e) => setEditColor(e.target.value)} className="flex-1" />
                <input
                  type="color"
                  value={editColorHex}
                  onChange={(e) => setEditColorHex(e.target.value)}
                  className="w-10 h-10 rounded border cursor-pointer"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>Отмена</Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleEdit}
                disabled={updateTaskMutation.isPending}
              >
                {updateTaskMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Сохранить
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить задание?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Задание &laquo;{selectedTask?.product?.name}&raquo; будет удалено навсегда.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => selectedTask && deleteTaskMutation.mutate(selectedTask.id)}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ============ TAB 4: СОТРУДНИКИ ============
export function EmployeesTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)

  const [newName, setNewName] = useState('')
  const [newCode, setNewCode] = useState('')
  const [newRole, setNewRole] = useState('sewer')
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const [editName, setEditName] = useState('')
  const [editCode, setEditCode] = useState('')
  const [editRole, setEditRole] = useState('sewer')
  const [editUsername, setEditUsername] = useState('')
  const [editPassword, setEditPassword] = useState('')

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => fetch('/api/employees').then((r) => r.json()),
  })

  const createMutation = useMutation({
    mutationFn: (data: Record<string, string>) =>
      fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      setCreateOpen(false)
      setNewName('')
      setNewCode('')
      setNewRole('sewer')
      setNewUsername('')
      setNewPassword('')
      toast({ title: 'Сотрудник добавлен', description: 'Новый сотрудник создан' })
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось добавить сотрудника', variant: 'destructive' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, string> }) =>
      fetch(`/api/employees/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      setEditOpen(false)
      setEditPassword('')
      toast({ title: 'Сотрудник обновлён', description: 'Изменения сохранены' })
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось обновить сотрудника', variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/employees/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      setDeleteOpen(false)
      setSelectedEmployee(null)
      toast({ title: 'Сотрудник удалён', description: 'Сотрудник успешно удалён' })
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось удалить сотрудника', variant: 'destructive' })
    },
  })

  const handleOpenEdit = useCallback((emp: Employee & { username?: string }) => {
    setSelectedEmployee(emp)
    setEditName(emp.name)
    setEditCode(emp.code)
    setEditRole(emp.role)
    setEditUsername((emp as { username?: string }).username || '')
    setEditPassword('')
    setEditOpen(true)
  }, [])

  const handleOpenDelete = useCallback((emp: Employee) => {
    setSelectedEmployee(emp)
    setDeleteOpen(true)
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px]"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Добавить сотрудника
        </Button>
      </div>

      {employees.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Сотрудники не добавлены</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {employees.map((emp: Employee) => (
            <Card key={emp.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold">{emp.name}</div>
                    <div className="text-sm text-muted-foreground">{emp.code}</div>
                    <Badge variant="secondary" className="mt-2 text-xs">
                      {getRoleLabel(emp.role)}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => handleOpenEdit(emp)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      onClick={() => handleOpenDelete(emp)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Employee Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Новый сотрудник</DialogTitle>
            <DialogDescription>Добавьте нового сотрудника</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ФИО</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Иванова Мария" />
            </div>
            <div className="space-y-2">
              <Label>Код</Label>
              <Input value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="Ш-001" />
            </div>
            <div className="space-y-2">
              <Label>Логин</Label>
              <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="sewer1" />
            </div>
            <div className="space-y-2">
              <Label>Пароль</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="123456" />
            </div>
            <div className="space-y-2">
              <Label>Роль</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYEE_ROLES.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Отмена</Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => createMutation.mutate({ name: newName, code: newCode, role: newRole, username: newUsername, password: newPassword })}
                disabled={createMutation.isPending || !newName || !newCode || !newUsername || !newPassword}
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Добавить
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Редактировать сотрудника</DialogTitle>
            <DialogDescription>Измените данные сотрудника</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ФИО</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Код</Label>
              <Input value={editCode} onChange={(e) => setEditCode(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Логин</Label>
              <Input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Пароль</Label>
              <Input type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="Оставьте пустым, чтобы не менять" />
              <p className="text-xs text-muted-foreground">Оставьте пустым, чтобы не менять пароль</p>
            </div>
            <div className="space-y-2">
              <Label>Роль</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYEE_ROLES.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>Отмена</Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => {
                  if (selectedEmployee) {
                    const data: Record<string, string> = { name: editName, code: editCode, role: editRole, username: editUsername }
                    if (editPassword) data.password = editPassword
                    updateMutation.mutate({ id: selectedEmployee.id, data })
                  }
                }}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Сохранить
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить сотрудника?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Сотрудник &laquo;{selectedEmployee?.name}&raquo; будет удалён навсегда вместе со всеми связанными заданиями.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => selectedEmployee && deleteMutation.mutate(selectedEmployee.id)}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ============ TAB 5: ИЗДЕЛИЯ ============
export function ProductsTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [newName, setNewName] = useState('')
  const [newArticle, setNewArticle] = useState('')
  const [newSewerRate, setNewSewerRate] = useState('150')
  const [newHomeRate, setNewHomeRate] = useState('0')
  const [newQcRate, setNewQcRate] = useState('50')
  const [newReworkRate, setNewReworkRate] = useState('80')
  const [newIsKit, setNewIsKit] = useState(false)
  const [newSizes, setNewSizes] = useState<string[]>([])
  const [newSizeInput, setNewSizeInput] = useState('')
  const [newColors, setNewColors] = useState<Array<{ color: string; colorHex: string }>>([])
  const [newColorName, setNewColorName] = useState('')
  const [newColorHex, setNewColorHex] = useState('#9ca3af')
  const [newReworkReasons, setNewReworkReasons] = useState<string[]>([])
  const [newReasonInput, setNewReasonInput] = useState('')
  const [editName, setEditName] = useState('')
  const [editArticle, setEditArticle] = useState('')
  const [editSewerRate, setEditSewerRate] = useState('150')
  const [editHomeRate, setEditHomeRate] = useState('0')
  const [editQcRate, setEditQcRate] = useState('50')
  const [editReworkRate, setEditReworkRate] = useState('80')
  const [editIsKit, setEditIsKit] = useState(false)
  const [editSizes, setEditSizes] = useState<string[]>([])
  const [editSizeInput, setEditSizeInput] = useState('')
  const [editColors, setEditColors] = useState<Array<{ color: string; colorHex: string }>>([])
  const [editColorName, setEditColorName] = useState('')
  const [editColorHex, setEditColorHex] = useState('#9ca3af')
  const [editReworkReasons, setEditReworkReasons] = useState<string[]>([])
  const [editReasonInput, setEditReasonInput] = useState('')

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => fetch('/api/products').then((r) => r.json()),
  })

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); setCreateOpen(false); resetCreateForm(); toast({ title: 'Изделие создано' }) },
    onError: () => { toast({ title: 'Ошибка', description: 'Не удалось создать изделие', variant: 'destructive' }) },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      fetch(`/api/products/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); setEditOpen(false); setSelectedProduct(null); toast({ title: 'Изделие обновлено' }) },
    onError: () => { toast({ title: 'Ошибка', description: 'Не удалось обновить изделие', variant: 'destructive' }) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/products/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); setDeleteOpen(false); setSelectedProduct(null); toast({ title: 'Изделие удалено' }) },
    onError: () => { toast({ title: 'Ошибка', description: 'Не удалось удалить изделие', variant: 'destructive' }) },
  })

  const resetCreateForm = useCallback(() => {
    setNewName(''); setNewArticle(''); setNewSewerRate('150'); setNewHomeRate('0'); setNewQcRate('50'); setNewReworkRate('80'); setNewIsKit(false); setNewSizes([]); setNewSizeInput(''); setNewColors([]); setNewColorName(''); setNewColorHex('#9ca3af'); setNewReworkReasons([]); setNewReasonInput('')
  }, [])

  const handleCreate = useCallback(() => {
    if (!newName.trim() || !newArticle.trim()) { toast({ title: 'Ошибка', description: 'Заполните название и артикул', variant: 'destructive' }); return }
    createMutation.mutate({ name: newName, article: newArticle, sewerRate: parseInt(newSewerRate) || 150, homeRate: parseInt(newHomeRate) || 0, qcRate: parseInt(newQcRate) || 50, reworkRate: parseInt(newReworkRate) || 80, isKit: newIsKit, sizes: newSizes, colors: newColors })
  }, [newName, newArticle, newSewerRate, newHomeRate, newQcRate, newReworkRate, newIsKit, newSizes, newColors, createMutation, toast])

  const handleOpenEdit = useCallback((product: Product) => {
    setSelectedProduct(product); setEditName(product.name); setEditArticle(product.article); setEditSewerRate(String(product.sewerRate)); setEditHomeRate(String(product.homeRate)); setEditQcRate(String(product.qcRate)); setEditReworkRate(String(product.reworkRate)); setEditIsKit(product.isKit); setEditSizes(product.sizes.map((s) => s.size)); setEditSizeInput(''); setEditColors(product.colors.map((c) => ({ color: c.color, colorHex: c.colorHex }))); setEditColorName(''); setEditColorHex('#9ca3af'); setEditReworkReasons(product.reworkReasons.map((r) => r.text)); setEditReasonInput(''); setEditOpen(true)
  }, [])

  const handleUpdate = useCallback(() => {
    if (!selectedProduct || !editName.trim() || !editArticle.trim()) { toast({ title: 'Ошибка', description: 'Заполните название и артикул', variant: 'destructive' }); return }
    updateMutation.mutate({ id: selectedProduct.id, data: { name: editName, article: editArticle, sewerRate: parseInt(editSewerRate) || 150, homeRate: parseInt(editHomeRate) || 0, qcRate: parseInt(editQcRate) || 50, reworkRate: parseInt(editReworkRate) || 80, isKit: editIsKit, sizes: editSizes, colors: editColors } })
  }, [selectedProduct, editName, editArticle, editSewerRate, editHomeRate, editQcRate, editReworkRate, editIsKit, editSizes, editColors, updateMutation, toast])

  if (isLoading) { return (<div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /><span className="ml-2 text-muted-foreground">Загрузка...</span></div>) }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Изделия</h2>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { resetCreateForm(); setCreateOpen(true) }}><Plus className="h-4 w-4 mr-1" />Добавить изделие</Button>
      </div>
      {products.length === 0 ? (
        <Card className="border-dashed"><CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground"><Package className="h-12 w-12 mb-3 opacity-30" /><p>Нет изделий в справочнике</p></CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product: Product) => (
            <Card key={product.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div><CardTitle className="text-base">{product.name}</CardTitle><CardDescription className="text-xs">{product.article}</CardDescription></div>
                  {product.isKit && <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">ч/б</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Швея:</span> {product.sewerRate} ₽</div>
                  <div><span className="text-muted-foreground">Дома:</span> {product.homeRate} ₽</div>
                  <div><span className="text-muted-foreground">ОТК:</span> {product.qcRate} ₽</div>
                  <div><span className="text-muted-foreground">Перед.:</span> {product.reworkRate} ₽</div>
                </div>
                {product.sizes.length > 0 && (<div className="flex flex-wrap gap-1">{product.sizes.map((s) => (<Badge key={s.id} variant="outline" className="text-xs">{s.size}</Badge>))}</div>)}
                {product.colors.length > 0 && (<div className="flex flex-wrap gap-1">{product.colors.map((c) => (<Badge key={c.id} variant="outline" className="text-xs">{getColorDot(c.colorHex)}{c.color}</Badge>))}</div>)}
                {product.reworkReasons.length > 0 && (<div className="text-xs text-muted-foreground">Переделки: {product.reworkReasons.map((r) => r.text).join(', ')}</div>)}
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" className="flex-1 min-h-[44px]" onClick={() => handleOpenEdit(product)}><Pencil className="h-4 w-4 mr-1" />Изменить</Button>
                  <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 min-h-[44px]" onClick={() => { setSelectedProduct(product); setDeleteOpen(true) }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Product Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh]">
          <DialogHeader><DialogTitle>Новое изделие</DialogTitle><DialogDescription>Заполните данные изделия</DialogDescription></DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Название</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Футболка" /></div>
                <div className="space-y-2"><Label>Артикул</Label><Input value={newArticle} onChange={(e) => setNewArticle(e.target.value)} placeholder="ФК-001" /></div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-2"><Label>Швея, ₽</Label><Input type="number" min="0" value={newSewerRate} onChange={(e) => setNewSewerRate(e.target.value)} /></div>
                <div className="space-y-2"><Label>Дома, ₽</Label><Input type="number" min="0" value={newHomeRate} onChange={(e) => setNewHomeRate(e.target.value)} /></div>
                <div className="space-y-2"><Label>ОТК, ₽</Label><Input type="number" min="0" value={newQcRate} onChange={(e) => setNewQcRate(e.target.value)} /></div>
                <div className="space-y-2"><Label>Переделка, ₽</Label><Input type="number" min="0" value={newReworkRate} onChange={(e) => setNewReworkRate(e.target.value)} /></div>
              </div>
              <div className="flex items-center gap-2"><Checkbox id="newIsKit" checked={newIsKit} onCheckedChange={(c) => setNewIsKit(c === true)} /><Label htmlFor="newIsKit">Чёрно-белый комплект (ч/б)</Label></div>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-medium">Размеры</Label>
                <div className="flex flex-wrap gap-1 mb-2">{newSizes.map((s, i) => (<Badge key={i} variant="secondary" className="gap-1">{s}<X className="h-3 w-3 cursor-pointer" onClick={() => setNewSizes((prev) => prev.filter((_, j) => j !== i))} /></Badge>))}</div>
                <div className="flex gap-2"><Input value={newSizeInput} onChange={(e) => setNewSizeInput(e.target.value)} placeholder="S, M, L..." onKeyDown={(e) => { if (e.key === 'Enter' && newSizeInput.trim()) { setNewSizes((prev) => [...prev, newSizeInput.trim()]); setNewSizeInput('') } }} /><Button size="sm" variant="outline" onClick={() => { if (newSizeInput.trim()) { setNewSizes((prev) => [...prev, newSizeInput.trim()]); setNewSizeInput('') } }}><Plus className="h-4 w-4" /></Button></div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Цвета</Label>
                <div className="flex flex-wrap gap-1 mb-2">{newColors.map((c, i) => (<Badge key={i} variant="secondary" className="gap-1">{getColorDot(c.colorHex)}{c.color}<X className="h-3 w-3 cursor-pointer" onClick={() => setNewColors((prev) => prev.filter((_, j) => j !== i))} /></Badge>))}</div>
                <div className="flex gap-2 items-end"><div className="flex-1"><Input value={newColorName} onChange={(e) => setNewColorName(e.target.value)} placeholder="Название цвета" /></div><input type="color" value={newColorHex} onChange={(e) => setNewColorHex(e.target.value)} className="w-10 h-10 rounded cursor-pointer border p-0" /><Button size="sm" variant="outline" onClick={() => { if (newColorName.trim()) { setNewColors((prev) => [...prev, { color: newColorName.trim(), colorHex: newColorHex }]); setNewColorName(''); setNewColorHex('#9ca3af') } }}><Plus className="h-4 w-4" /></Button></div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Причины переделок</Label>
                <div className="flex flex-wrap gap-1 mb-2">{newReworkReasons.map((r, i) => (<Badge key={i} variant="secondary" className="gap-1">{r}<X className="h-3 w-3 cursor-pointer" onClick={() => setNewReworkReasons((prev) => prev.filter((_, j) => j !== i))} /></Badge>))}</div>
                <div className="flex gap-2"><Input value={newReasonInput} onChange={(e) => setNewReasonInput(e.target.value)} placeholder="Кривой шов..." onKeyDown={(e) => { if (e.key === 'Enter' && newReasonInput.trim()) { setNewReworkReasons((prev) => [...prev, newReasonInput.trim()]); setNewReasonInput('') } }} /><Button size="sm" variant="outline" onClick={() => { if (newReasonInput.trim()) { setNewReworkReasons((prev) => [...prev, newReasonInput.trim()]); setNewReasonInput('') } }}><Plus className="h-4 w-4" /></Button></div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Отмена</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleCreate} disabled={createMutation.isPending}>{createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Создать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh]">
          <DialogHeader><DialogTitle>Редактировать изделие</DialogTitle><DialogDescription>Измените данные изделия</DialogDescription></DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Название</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
                <div className="space-y-2"><Label>Артикул</Label><Input value={editArticle} onChange={(e) => setEditArticle(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-2"><Label>Швея, ₽</Label><Input type="number" min="0" value={editSewerRate} onChange={(e) => setEditSewerRate(e.target.value)} /></div>
                <div className="space-y-2"><Label>Дома, ₽</Label><Input type="number" min="0" value={editHomeRate} onChange={(e) => setEditHomeRate(e.target.value)} /></div>
                <div className="space-y-2"><Label>ОТК, ₽</Label><Input type="number" min="0" value={editQcRate} onChange={(e) => setEditQcRate(e.target.value)} /></div>
                <div className="space-y-2"><Label>Переделка, ₽</Label><Input type="number" min="0" value={editReworkRate} onChange={(e) => setEditReworkRate(e.target.value)} /></div>
              </div>
              <div className="flex items-center gap-2"><Checkbox id="editIsKit" checked={editIsKit} onCheckedChange={(c) => setEditIsKit(c === true)} /><Label htmlFor="editIsKit">Чёрно-белый комплект (ч/б)</Label></div>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-medium">Размеры</Label>
                <div className="flex flex-wrap gap-1 mb-2">{editSizes.map((s, i) => (<Badge key={i} variant="secondary" className="gap-1">{s}<X className="h-3 w-3 cursor-pointer" onClick={() => setEditSizes((prev) => prev.filter((_, j) => j !== i))} /></Badge>))}</div>
                <div className="flex gap-2"><Input value={editSizeInput} onChange={(e) => setEditSizeInput(e.target.value)} placeholder="S, M, L..." onKeyDown={(e) => { if (e.key === 'Enter' && editSizeInput.trim()) { setEditSizes((prev) => [...prev, editSizeInput.trim()]); setEditSizeInput('') } }} /><Button size="sm" variant="outline" onClick={() => { if (editSizeInput.trim()) { setEditSizes((prev) => [...prev, editSizeInput.trim()]); setEditSizeInput('') } }}><Plus className="h-4 w-4" /></Button></div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Цвета</Label>
                <div className="flex flex-wrap gap-1 mb-2">{editColors.map((c, i) => (<Badge key={i} variant="secondary" className="gap-1">{getColorDot(c.colorHex)}{c.color}<X className="h-3 w-3 cursor-pointer" onClick={() => setEditColors((prev) => prev.filter((_, j) => j !== i))} /></Badge>))}</div>
                <div className="flex gap-2 items-end"><div className="flex-1"><Input value={editColorName} onChange={(e) => setEditColorName(e.target.value)} placeholder="Название цвета" /></div><input type="color" value={editColorHex} onChange={(e) => setEditColorHex(e.target.value)} className="w-10 h-10 rounded cursor-pointer border p-0" /><Button size="sm" variant="outline" onClick={() => { if (editColorName.trim()) { setEditColors((prev) => [...prev, { color: editColorName.trim(), colorHex: editColorHex }]); setEditColorName(''); setEditColorHex('#9ca3af') } }}><Plus className="h-4 w-4" /></Button></div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Причины переделок</Label>
                <div className="flex flex-wrap gap-1 mb-2">{editReworkReasons.map((r, i) => (<Badge key={i} variant="secondary" className="gap-1">{r}<X className="h-3 w-3 cursor-pointer" onClick={() => setEditReworkReasons((prev) => prev.filter((_, j) => j !== i))} /></Badge>))}</div>
                <div className="flex gap-2"><Input value={editReasonInput} onChange={(e) => setEditReasonInput(e.target.value)} placeholder="Кривой шов..." onKeyDown={(e) => { if (e.key === 'Enter' && editReasonInput.trim()) { setEditReworkReasons((prev) => [...prev, editReasonInput.trim()]); setEditReasonInput('') } }} /><Button size="sm" variant="outline" onClick={() => { if (editReasonInput.trim()) { setEditReworkReasons((prev) => [...prev, editReasonInput.trim()]); setEditReasonInput('') } }}><Plus className="h-4 w-4" /></Button></div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Отмена</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleUpdate} disabled={updateMutation.isPending}>{updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Удалить изделие?</AlertDialogTitle><AlertDialogDescription>Это действие нельзя отменить. Изделие &laquo;{selectedProduct?.name}&raquo; будет удалено навсегда.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={() => selectedProduct && deleteMutation.mutate(selectedProduct.id)}>Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
