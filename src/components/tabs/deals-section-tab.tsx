'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CRMTab } from '@/components/tabs/crm-tab'
import { ContractsTab } from '@/components/tabs/contracts-tab'
import { InvoicesTab } from '@/components/tabs/invoices-tab'
import { UPDTab } from '@/components/tabs/upd-tab'

export function DealsSectionTab() {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="crm" className="w-full">
        <TabsList>
          <TabsTrigger value="crm">Переговоры</TabsTrigger>
          <TabsTrigger value="contracts">Договоры</TabsTrigger>
          <TabsTrigger value="invoices">Счета</TabsTrigger>
          <TabsTrigger value="upd">УПД</TabsTrigger>
        </TabsList>
        <TabsContent value="crm">
          <CRMTab />
        </TabsContent>
        <TabsContent value="contracts">
          <ContractsTab />
        </TabsContent>
        <TabsContent value="invoices">
          <InvoicesTab />
        </TabsContent>
        <TabsContent value="upd">
          <UPDTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
