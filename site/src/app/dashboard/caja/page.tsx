import { sql } from '@/lib/db'
import { marcarPagado } from './actions'

export const metadata = { title: 'Caja — PetStock' }

export default async function CajaPage() {
  // Ventas recientes (últimas 50)
  const ventas = await sql`
    SELECT
      v.id, v.producto, v.cantidad, v.precio, v.pagado, v.fecha_venta,
      c.nombre AS cliente_nombre,
      c.telefono AS cliente_telefono
    FROM ventas v
    LEFT JOIN clientes c ON c.id = v.cliente_id
    ORDER BY v.fecha_venta DESC
    LIMIT 50
  `

  // Movimientos de caja (últimos 30)
  const movimientos = await sql`
    SELECT id, descripcion, monto, categoria, created_at
    FROM movimientos_caja
    ORDER BY created_at DESC
    LIMIT 30
  `

  // Stock actual
  const productos = await sql`
    SELECT nombre, marca, stock_actual FROM productos
    ORDER BY marca, nombre
  `

  // Pendiente de cobro agrupado por cliente
  const ventasNoPagas = ventas.filter(v => !v.pagado)
  const deudoreMap = new Map<string, { nombre: string; telefono: string | null; total: number; ventas: typeof ventas }>()
  for (const v of ventasNoPagas) {
    const key = (v.cliente_nombre as string) ?? 'Desconocido'
    if (!deudoreMap.has(key)) {
      deudoreMap.set(key, { nombre: key, telefono: v.cliente_telefono as string | null, total: 0, ventas: [] })
    }
    const entry = deudoreMap.get(key)!
    entry.total += (v.precio as number) * ((v.cantidad as number) ?? 1)
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
                        <div key={v.id as string} className="flex items-center gap-3 text-sm text-slate-300">
                          <span>{v.producto} ×{(v.cantidad as number) ?? 1} — ${((v.precio as number) * ((v.cantidad as number) ?? 1)).toLocaleString('es-UY')}</span>
                          <form action={marcarPagado.bind(null, v.id as string)}>
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
              {ventas.map(v => {
                const total = (v.precio as number) * ((v.cantidad as number) ?? 1)
                return (
                  <tr key={v.id as string} className={`border-b border-slate-800/50 ${!v.pagado ? 'bg-red-950/30' : ''}`}>
                    <td className="py-2 pr-4 text-slate-400">
                      {new Date((v.fecha_venta as string) + 'T12:00:00').toLocaleDateString('es-UY')}
                    </td>
                    <td className="py-2 pr-4 text-white">{(v.cliente_nombre as string) ?? '—'}</td>
                    <td className="py-2 pr-4 text-slate-300">{v.producto as string}</td>
                    <td className="py-2 pr-4 text-right text-slate-300">{(v.cantidad as number) ?? 1}</td>
                    <td className="py-2 pr-4 text-right text-white">${total.toLocaleString('es-UY')}</td>
                    <td className="py-2">
                      {v.pagado ? (
                        <span className="text-green-400 text-xs">✅ Pagado</span>
                      ) : (
                        <form action={marcarPagado.bind(null, v.id as string)} className="inline">
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

      {/* ── Movimientos de caja ───────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-3">Movimientos de caja</h2>
        {movimientos.length === 0 ? (
          <p className="text-slate-500 text-sm">Sin movimientos registrados. Mandá un mensaje al bot de Telegram con tus gastos o ingresos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800">
                  <th className="text-left py-2 pr-4">Fecha</th>
                  <th className="text-left py-2 pr-4">Descripción</th>
                  <th className="text-right py-2">Monto</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map(m => {
                  const esEgreso = m.categoria === 'egreso'
                  return (
                    <tr key={m.id as string} className="border-b border-slate-800/50">
                      <td className="py-2 pr-4 text-slate-400">
                        {new Date(m.created_at as string).toLocaleDateString('es-UY')}
                      </td>
                      <td className="py-2 pr-4 text-white flex items-center gap-2">
                        <span>{esEgreso ? '💸' : '💰'}</span>
                        <span>{m.descripcion as string}</span>
                      </td>
                      <td className={`py-2 text-right font-medium ${esEgreso ? 'text-red-400' : 'text-green-400'}`}>
                        {esEgreso ? '-' : '+'}${(m.monto as number).toLocaleString('es-UY')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
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
              {productos.map(p => {
                const bajo     = (p.stock_actual as number) <= 2
                const sinStock = (p.stock_actual as number) <= 0
                return (
                  <tr key={p.nombre as string} className="border-b border-slate-800/50">
                    <td className="py-2 pr-4 text-slate-400">{p.marca as string}</td>
                    <td className="py-2 pr-4 text-white">{p.nombre as string}</td>
                    <td className="py-2 text-right">
                      {sinStock ? (
                        <span className="text-red-400 font-medium">Sin stock</span>
                      ) : bajo ? (
                        <span className="text-orange-400 font-medium">⚠️ {p.stock_actual as number}</span>
                      ) : (
                        <span className="text-slate-300">{p.stock_actual as number}</span>
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
