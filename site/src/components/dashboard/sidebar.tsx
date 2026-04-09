'use client'

import { SalesPieChart } from './sales-pie-chart'
import { AlertsList } from './alerts-list'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

interface SidebarProps {
  totalVentas: number
  meta: number
  alertas: Array<{
    id: string
    clienteNombre: string
    mascotaNombre: string
    producto: string
    diasRestantes: number
  }>
}

export function Sidebar({ totalVentas, meta, alertas }: SidebarProps) {
  const router = useRouter()
  return (
    <aside className="w-full md:w-[220px] md:min-h-screen bg-slate-950 border-b md:border-b-0 md:border-r border-slate-800 p-4 flex flex-col gap-4">
      <SalesPieChart totalVentas={totalVentas} meta={meta} />
      <Button
        onClick={() => router.push('/dashboard/clientes/new')}
        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm"
      >
        + Nueva venta
      </Button>
      <div className="border-t border-slate-800 pt-4">
        <AlertsList alertas={alertas} />
      </div>
    </aside>
  )
}
