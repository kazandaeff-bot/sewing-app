'use client'

import { FileText } from 'lucide-react'

export function StubTab({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <FileText className="h-16 w-16 mb-4 opacity-20" />
      <p className="text-lg font-medium">Раздел в разработке</p>
      {message && <p className="text-sm mt-1 max-w-md text-center">{message}</p>}
      {!message && <p className="text-sm mt-1">Данный раздел будет доступен позже</p>}
    </div>
  )
}
