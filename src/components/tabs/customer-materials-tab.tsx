'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, Package } from 'lucide-react'

// ============ TAB: Customer Materials ============
export function CustomerMaterialsTab({ customerId }: { customerId: string }) {
  const { data: materials = [], isLoading, error } = useQuery({
    queryKey: ['material-balance', customerId],
    queryFn: async () => {
      const res = await fetch(`/api/material-balance?customerId=${customerId}`)
      if (res.status === 403) {
        throw new Error('access_denied')
      }
      return res.json()
    },
    enabled: !!customerId,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        <span className="ml-2 text-muted-foreground">Загрузка остатков...</span>
      </div>
    )
  }

  if (error && error.message === 'access_denied') {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-muted-foreground">Доступ к остаткам материалов не открыт. Обратитесь к администратору.</p>
        </CardContent>
      </Card>
    )
  }

  if (!materials || materials.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-muted-foreground">Нет данных по материалам</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left font-medium">Материал</th>
                <th className="p-3 text-left font-medium">Ед.</th>
                <th className="p-3 text-right font-medium">Остаток</th>
                <th className="p-3 text-right font-medium">Списано</th>
                <th className="p-3 text-right font-medium">Нормы расхода</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((mat: any) => (
                <tr key={mat.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3 font-medium">{mat.name}</td>
                  <td className="p-3 text-muted-foreground">{mat.unit}</td>
                  <td className="p-3 text-right font-semibold">{mat.totalQty.toLocaleString('ru-RU')}</td>
                  <td className="p-3 text-right text-red-600">{mat.consumed.toLocaleString('ru-RU')}</td>
                  <td className="p-3 text-right">
                    <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                      {mat.norms.map((n: any, i: number) => (
                        <span key={i}>{n.productName}: {n.consumptionPerUnit} {n.unit}/шт</span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
