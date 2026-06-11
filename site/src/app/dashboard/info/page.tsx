import { sql } from '@/lib/db'
import { SpeciesChart } from '@/components/dashboard/species-chart'
import { ProductsChart } from '@/components/dashboard/products-chart'
import { AlertsTimeline } from '@/components/dashboard/alerts-timeline'
import { MonthlyTrend } from '@/components/dashboard/monthly-trend'
import { AcquisitionChart } from '@/components/dashboard/acquisition-chart'
import { diasHastaFin, fechaHoyUruguay } from '@/lib/calculations'

export const metadata = { title: 'Info — PetStock' }

export default async function InfoPage() {
  const ventas = await sql`
    SELECT
      v.fecha_estimada_fin,
      v.precio,
      v.fecha_venta,
      v.producto,
      p.especie
    FROM ventas v
    JOIN clientes c ON c.id = v.cliente_id AND c.activo = true
    LEFT JOIN perros p ON p.id = v.perro_id
    ORDER BY v.fecha_estimada_fin ASC NULLS LAST
  `

  const perros = ventas.filter(v => v.especie === 'perro').length
  const gatos  = ventas.filter(v => v.especie === 'gato').length

  const productosMap = new Map<string, number>()
  ventas.forEach(v => {
    productosMap.set(v.producto as string, (productosMap.get(v.producto as string) || 0) + 1)
  })
  const productos = Array.from(productosMap.entries()).map(([nombre, cantidad]) => ({ nombre, cantidad }))

  const hoy = fechaHoyUruguay()
  const alertasPorSemana: { semana: string; cantidad: number }[] = []
  for (let i = 0; i < 4; i++) {
    const inicioSemana = new Date(hoy); inicioSemana.setDate(hoy.getDate() + i * 7)
    const finSemana    = new Date(hoy); finSemana.setDate(hoy.getDate() + (i + 1) * 7 - 1)
    const cantidad = ventas.filter(v => {
      if (!v.fecha_estimada_fin) return false
      const fecha = new Date(v.fecha_estimada_fin as string)
      return fecha >= inicioSemana && fecha <= finSemana
    }).length
    alertasPorSemana.push({
      semana: i === 0 ? 'Esta sem.' : i === 1 ? 'Próx. sem.' : `Sem. ${i + 1}`,
      cantidad,
    })
  }

  const hace5Meses = fechaHoyUruguay()
  hace5Meses.setMonth(hace5Meses.getMonth() - 5)
  const todasVentas = await sql`
    SELECT precio, fecha_venta FROM ventas
    WHERE fecha_venta >= ${hace5Meses.toISOString().split('T')[0]}
  `

  const ventasPorMes = new Map<string, { total: number; cantidad: number }>()
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  todasVentas.forEach(v => {
    const fecha  = new Date(v.fecha_venta as string)
    const mesKey = `${meses[fecha.getMonth()]} ${fecha.getFullYear().toString().slice(-2)}`
    const actual = ventasPorMes.get(mesKey) || { total: 0, cantidad: 0 }
    ventasPorMes.set(mesKey, { total: actual.total + (v.precio as number), cantidad: actual.cantidad + 1 })
  })
  const ventasMensuales = Array.from(ventasPorMes.entries())
    .map(([mes, data]) => ({ mes, ...data }))
    .slice(-6)

  const origenesRaw = await sql`
    SELECT origen, COUNT(*)::int AS cantidad
    FROM clientes
    WHERE activo = true
    GROUP BY origen
    ORDER BY cantidad DESC
  `
  const origenes = origenesRaw.map(r => ({
    origen: (r.origen as string | null),
    cantidad: r.cantidad as number,
  }))

  const totalClientes = perros + gatos
  const META = 102000
  const totalVentas = ventas.reduce((sum, v) => sum + (v.precio as number), 0)
  const porcentajeMeta = Math.min((totalVentas / META) * 100, 100)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Info</h1>

      {/* Meta de ventas */}
      <div className="bg-slate-900 rounded-lg p-5 border border-slate-800">
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Meta de ventas</p>
            <p className="text-white text-3xl font-bold">${totalVentas.toLocaleString('es-UY')}</p>
          </div>
          <p className="text-slate-400 text-sm">de ${META.toLocaleString('es-UY')}</p>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-3">
          <div
            className="bg-amber-500 h-3 rounded-full transition-all"
            style={{ width: `${porcentajeMeta}%` }}
          />
        </div>
        <p className="text-slate-400 text-xs mt-2">{porcentajeMeta.toFixed(1)}% completado</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-900/50 to-slate-900 rounded-lg p-4 border border-blue-800/30">
          <p className="text-blue-400 text-xs uppercase tracking-wide">Clientes Activos</p>
          <p className="text-white text-2xl font-bold mt-1">{totalClientes}</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
        <div className="bg-slate-900 rounded-lg p-4">
          <h3 className="text-white font-semibold text-sm mb-3">Cómo Llegaron los Clientes</h3>
          <AcquisitionChart origenes={origenes} />
        </div>
      </div>
    </div>
  )
}
