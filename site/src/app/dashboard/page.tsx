import { createClient } from '@/lib/supabase/server'
import { CrmTable } from '@/components/dashboard/crm-table'
import { SpeciesChart } from '@/components/dashboard/species-chart'
import { ProductsChart } from '@/components/dashboard/products-chart'
import { AlertsTimeline } from '@/components/dashboard/alerts-timeline'
import { MonthlyTrend } from '@/components/dashboard/monthly-trend'
import { diasHastaFin, fechaHoyUruguay } from '@/lib/calculations'

type VentaConRelaciones = {
  id: string
  producto: string
  precio: number
  fecha_venta: string
  fecha_estimada_fin: string | null
  clientes: { id: string; nombre: string; direccion: string | null; activo: boolean } | null
  perros: { id: string; nombre: string; especie: 'perro' | 'gato'; peso_kg: number | null } | null
}

export default async function DashboardPage() {
  const supabase = await createClient()

  // Obtener ventas con clientes activos para la tabla
  const { data } = await supabase
    .from('ventas')
    .select(`
      id,
      producto,
      precio,
      fecha_venta,
      fecha_estimada_fin,
      clientes!inner(id, nombre, direccion, activo),
      perros(id, nombre, especie, peso_kg)
    `)
    .order('fecha_estimada_fin', { ascending: true, nullsFirst: false })
    .eq('clientes.activo', true)

  const ventas = (data ?? []) as unknown as VentaConRelaciones[]

  const clientes = ventas.map(v => ({
    ventaId: v.id,
    clienteId: v.clientes?.id ?? '',
    clienteNombre: v.clientes?.nombre ?? '',
    mascotaNombre: v.perros?.nombre ?? '',
    mascotaPeso: v.perros?.peso_kg ?? null,
    especie: v.perros?.especie ?? 'perro',
    producto: v.producto,
    direccion: v.clientes?.direccion ?? null,
    fechaFin: v.fecha_estimada_fin,
    diasRestantes: v.fecha_estimada_fin ? diasHastaFin(new Date(v.fecha_estimada_fin)) : null,
  }))

  // Datos para gráfica de especies
  const perros = ventas.filter(v => v.perros?.especie === 'perro').length
  const gatos = ventas.filter(v => v.perros?.especie === 'gato').length

  // Datos para gráfica de productos más vendidos
  const productosMap = new Map<string, number>()
  ventas.forEach(v => {
    productosMap.set(v.producto, (productosMap.get(v.producto) || 0) + 1)
  })
  const productos = Array.from(productosMap.entries()).map(([nombre, cantidad]) => ({
    nombre,
    cantidad,
  }))

  // Datos para timeline de alertas (próximas 4 semanas)
  const hoy = fechaHoyUruguay()
  const alertasPorSemana: { semana: string; cantidad: number }[] = []
  for (let i = 0; i < 4; i++) {
    const inicioSemana = new Date(hoy)
    inicioSemana.setDate(hoy.getDate() + i * 7)
    const finSemana = new Date(hoy)
    finSemana.setDate(hoy.getDate() + (i + 1) * 7 - 1)

    const cantidad = ventas.filter(v => {
      if (!v.fecha_estimada_fin) return false
      const fecha = new Date(v.fecha_estimada_fin)
      return fecha >= inicioSemana && fecha <= finSemana
    }).length

    alertasPorSemana.push({
      semana: i === 0 ? 'Esta sem.' : i === 1 ? 'Próx. sem.' : `Sem. ${i + 1}`,
      cantidad,
    })
  }

  // Obtener todas las ventas para gráfica mensual (últimos 6 meses)
  const hace5Meses = fechaHoyUruguay()
  hace5Meses.setMonth(hace5Meses.getMonth() - 5)
  const { data: todasVentas } = await supabase
    .from('ventas')
    .select('precio, fecha_venta')
    .gte('fecha_venta', hace5Meses.toISOString().split('T')[0])

  const ventasPorMes = new Map<string, { total: number; cantidad: number }>()
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

  ;(todasVentas ?? []).forEach(v => {
    const fecha = new Date(v.fecha_venta)
    const mesKey = `${meses[fecha.getMonth()]} ${fecha.getFullYear().toString().slice(-2)}`
    const actual = ventasPorMes.get(mesKey) || { total: 0, cantidad: 0 }
    ventasPorMes.set(mesKey, {
      total: actual.total + v.precio,
      cantidad: actual.cantidad + 1,
    })
  })

  const ventasMensuales = Array.from(ventasPorMes.entries())
    .map(([mes, data]) => ({ mes, ...data }))
    .slice(-6)

  return (
    <div className="space-y-6">
      <CrmTable clientes={clientes} />

      {/* Gráficas adicionales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        <div className="bg-slate-900 rounded-lg p-4">
          <h3 className="text-white font-semibold text-sm mb-3">Distribución de Mascotas</h3>
          <SpeciesChart perros={perros} gatos={gatos} />
        </div>

        <div className="bg-slate-900 rounded-lg p-4">
          <h3 className="text-white font-semibold text-sm mb-3">Productos Más Vendidos</h3>
          <ProductsChart productos={productos} />
        </div>

        <div className="bg-slate-900 rounded-lg p-4">
          <h3 className="text-white font-semibold text-sm mb-3">Alertas Próximas</h3>
          <AlertsTimeline alertas={alertasPorSemana} />
        </div>

        <div className="bg-slate-900 rounded-lg p-4">
          <h3 className="text-white font-semibold text-sm mb-3">Ventas por Mes</h3>
          <MonthlyTrend ventas={ventasMensuales} />
        </div>
      </div>

      {/* Métricas rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-900/50 to-slate-900 rounded-lg p-4 border border-blue-800/30">
          <p className="text-blue-400 text-xs uppercase tracking-wide">Clientes Activos</p>
          <p className="text-white text-2xl font-bold mt-1">{clientes.length}</p>
        </div>
        <div className="bg-gradient-to-br from-green-900/50 to-slate-900 rounded-lg p-4 border border-green-800/30">
          <p className="text-green-400 text-xs uppercase tracking-wide">Perros</p>
          <p className="text-white text-2xl font-bold mt-1">{perros}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-900/50 to-slate-900 rounded-lg p-4 border border-emerald-800/30">
          <p className="text-emerald-400 text-xs uppercase tracking-wide">Gatos</p>
          <p className="text-white text-2xl font-bold mt-1">{gatos}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-900/50 to-slate-900 rounded-lg p-4 border border-orange-800/30">
          <p className="text-orange-400 text-xs uppercase tracking-wide">Alertas Esta Semana</p>
          <p className="text-white text-2xl font-bold mt-1">{alertasPorSemana[0]?.cantidad ?? 0}</p>
        </div>
      </div>
    </div>
  )
}
