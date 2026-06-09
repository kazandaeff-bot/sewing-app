'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { authFetch, authFetchJson } from '@/components/auth-provider'
import {
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Users,
} from 'lucide-react'

import type { Employee } from '@/types'
import { getRoleLabel } from '@/lib/formatters'
import { EMPLOYEE_ROLES } from '@/lib/constants'

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
  const [newCustomerId, setNewCustomerId] = useState('')

  const [editName, setEditName] = useState('')
  const [editCode, setEditCode] = useState('')
  const [editRole, setEditRole] = useState('sewer')
  const [editUsername, setEditUsername] = useState('')
  const [editPassword, setEditPassword] = useState('')

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const r = await authFetch('/api/employees')
      const data = await r.json()
      return Array.isArray(data) ? data : []
    },
  })

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const r = await authFetch('/api/customers')
      const data = await r.json()
      return Array.isArray(data) ? data : []
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: Record<string, string>) =>
      authFetchJson('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      setCreateOpen(false)
      setNewName('')
      setNewCode('')
      setNewRole('sewer')
      setNewUsername('')
      setNewPassword('')
      setNewCustomerId('')
      toast({ title: 'Сотрудник добавлен', description: 'Новый сотрудник создан' })
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, string> }) =>
      authFetchJson(`/api/employees/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      setEditOpen(false)
      setEditPassword('')
      toast({ title: 'Сотрудник обновлён', description: 'Изменения сохранены' })
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      authFetchJson(`/api/employees/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      setDeleteOpen(false)
      setSelectedEmployee(null)
      toast({ title: 'Сотрудник удалён', description: 'Сотрудник успешно удалён' })
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' })
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

  const roleOptions = EMPLOYEE_ROLES.filter(r => r.value !== 'customer')

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
                  {roleOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {newRole === 'customer' && (
              <div className="space-y-2">
                <Label>Заказчик <span className="text-red-500">*</span></Label>
                <Select value={newCustomerId} onValueChange={setNewCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите заказчика" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c: { id: string; name: string }) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Отмена</Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => createMutation.mutate({ name: newName, code: newCode, role: newRole, username: newUsername, password: newPassword, ...(newRole === 'customer' && newCustomerId ? { customerId: newCustomerId } : {}) })}
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
                  {roleOptions.map((opt) => (
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
