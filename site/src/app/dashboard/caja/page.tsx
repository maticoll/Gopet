import { createClient } from '@/lib/supabase/server'
import { marcarPagado } from './actions'

export const metadata = { title: 'Caja — PetStock' }

export default async function CajaPage() {
  const supabase = await createClient()

  // Ventas recientes (últimas 50)
  const { data: ventas } = await supabase
    .from('ventas')
    .select(`
      id, producto, cantidad, precio, pagado, fecha_venta,
      clientes(nombre, telefono)
    `)
    .order('fecha_venta', { ascending: false })
    .limit(50)

  // Stock actual
  const { data: productos } = await supabase
    .from('productos')
    .select('nombre, marca, stock_actual')
    .order('marca')
    .order('nombre')

  const ventasList = ventas ?? []
  const productosList = productos ?? []

  // Group unpaid sales by client
  const ventasNoPagas = ventasList.filter(v => !v.pagado)
  const deudoreMap = new Map<string, { nombre: string; telefono: string | null; total: number; ventas: typeof ventasList }>()
  for (const v of ventasNoPagas) {
    const cliente = (v.clientes as any)
    const key = cliente?.nombre ?? 'Desconocido'
    if (!deudoreMap.has(key)) {
      deudoreMap.set(key, { nombre: key, telefono: cliente?.telefono ?? null, total: 0, ventas: [] })
    }
    const entry = deudoreMap.get(key)!
    entry.total += v.precio * (v.cantidad ?? 1)
    entry.ventas.push(v)
  }
  const deudores = Array.from(deudoreMap.values())
  const totalPendiente = deudores.reduce((sum, d) => sum + d.total, 0)

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">Caja</h1>

      {/* ── Pendiente de cobro ─────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-3">
          Pendiente de cobro —{' '}
          <span className="text-red-400">${totalPendiente.toLocaleString('es-UY')}</span>
        </h2>
        {deudores.length === 0 ? (
          <p className="text-slate-500 text-sm">Todo cobrado ✅</p>
        ) : (
          <div className="space-y-2">
            {deudores.map(d => (
              <div key={d.nombre} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                <div className="flex justify-between items-start gap-4 flex-wrap">
                  <div>
                    <p className="text-white font-medium">{d.nombre}</p>
                    <p className="text-slate-400 text-sm">{d.telefono ?? '—'}</p>
                    <div className="mt-1 space-y-1">
                      {d.ventas.map(v => (
                        <div key={v.id} className="flex items-center gap-3 text-sm text-slate-300">
                          <span>{v.producto} ×{v.cantidad ?? 1} — ${(v.precio * (v.cantidad ?? 1)).toLocaleString('es-UY')}</span>
                          <form action={marcarPagado.bind(null, v.id)}>
                            <button type="submit" className="text-xs text-green-400 hover:text-green-300 border border-green-900 hover:border-green-700 px-2 py-0.5 rounded transition-colors">
                              Marcar pagado
                            </button>
                          </form>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-red-400 font-semibold">${d.total.toLocaleString('es-UY')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Ventas recientes ───────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-3">Ventas recientes</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800">
                <th className="text-left py-2 pr-4">Fecha</th>
                <th className="text-left py-2 pr-4">Cliente</th>
                <th className="text-left py-2 pr-4">Producto</th>
                <th className="text-right py-2 pr-4">Cant.</th>
                <th className="text-right py-2 pr-4">Total</th>
                <th className="text-left py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {ventasList.map(v => {
                const total = v.precio * (v.cantidad ?? 1)
                return (
                  <tr
                    key={v.id}
                    className={`border-b border-slate-800/50 ${!v.pagado ? 'bg-red-950/30' : ''}`}
                  >
                    <td className="py-2 pr-4 text-slate-400">
                      {new Date((v as any).fecha_venta + 'T12:00:00').toLocaleDateString('es-UY')}
                    </td>
                    <td className="py-2 pr-4 text-white">{(v.clientes as any)?.nombre ?? '—'}</td>
                    <td className="py-2 pr-4 text-slate-300">{v.producto}</td>
                    <td className="py-2 pr-4 text-right text-slate-300">{v.cantidad ?? 1}</td>
                    <td className="py-2 pr-4 text-right text-white">${total.toLocaleString('es-UY')}</td>
                    <td className="py-2">
                      {v.pagado ? (
                        <span className="text-green-400 text-xs">✅ Pagado</span>
                      ) : (
                        <form action={marcarPagado.bind(null, v.id)} className="inline">
                          <button type="submit" className="text-xs text-yellow-400 hover:text-yellow-300 border border-yellow-900 hover:border-yellow-700 px-2 py-0.5 rounded transition-colors">
                            Marcar pagado
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Stock actual ───────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-3">Stock actual</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800">
                <th className="text-left py-2 pr-4">Marca</th>
                <th className="text-left py-2 pr-4">Producto</th>
                <th className="text-right py-2">Stock</th>
              </tr>
            </thead>
            <tbody>
              {productosList.map(p => {
                const bajo = p.stock_actual <= 2
                const sinStock = p.stock_actual <= 0
                return (
                  <tr key={p.nombre} className="border-b border-slate-800/50">
                    <td className="py-2 pr-4 text-slate-400">{p.marca}</td>
                    <td className="py-2 pr-4 text-white">{p.nombre}</td>
                    <td className="py-2 text-right">
                      {sinStock ? (
                        <span className="text-red-400 font-medium">Sin stock</span>
                      ) : bajo ? (
                        <span className="text-orange-400 font-medium">⚠️ {p.stock_actual}</span>
                      ) : (
                        <span className="text-slate-300">{p.stock_actual}</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
