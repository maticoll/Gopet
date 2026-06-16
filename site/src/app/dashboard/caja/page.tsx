import { sql } from '@/lib/db'
import { marcarPagado } from './actions'
import VentasTable from './VentasTable'
import MovimientosTable from './MovimientosTable'

export const metadata = { title: 'Caja — PetStock' }

export default async function CajaPage() {
  // Ventas recientes (últimas 50)
  const ventasRaw = await sql`
    SELECT
      v.id, v.producto, v.cantidad, v.precio, v.pagado, v.fecha_venta, v.metodo_pago,
      v.cliente_id,
      c.nombre AS cliente_nombre,
      c.telefono AS cliente_telefono
    FROM ventas v
    LEFT JOIN clientes c ON c.id = v.cliente_id
    ORDER BY v.fecha_venta DESC
    LIMIT 50
  `

  // Movimientos de caja (últimos 30)
  const movimientosRaw = await sql`
    SELECT id, descripcion, monto, categoria, metodo_pago, etiqueta, pagado, fecha_limite_pago, fecha, created_at
    FROM movimientos_caja
    ORDER BY COALESCE(fecha, created_at::date) DESC, created_at DESC
    LIMIT 30
  `

  // Clientes activos para el selector de edición
  const clientesRaw = await sql`
    SELECT id, nombre FROM clientes WHERE activo = true ORDER BY nombre
  `

  // Pendiente de cobro agrupado por cliente
  const ventasNoPagas = ventasRaw.filter(v => !v.pagado)
  const deudoreMap = new Map<string, { nombre: string; telefono: string | null; total: number; ventas: typeof ventasRaw }>()
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

  // Totales por método de pago (solo ventas pagadas)
  const ventasPagadas = ventasRaw.filter(v => v.pagado)
  const totalEfectivo = ventasPagadas
    .filter(v => v.metodo_pago === 'efectivo')
    .reduce((sum, v) => sum + (v.precio as number) * ((v.cantidad as number) ?? 1), 0)
  const totalTransferencia = ventasPagadas
    .filter(v => v.metodo_pago === 'transferencia')
    .reduce((sum, v) => sum + (v.precio as number) * ((v.cantidad as number) ?? 1), 0)

  // Movimientos por método — SOLO los pagados afectan el saldo. Un gasto o
  // compra que todavía no se pagó no resta plata de caja hasta que se marque
  // como pagado (lo mismo para un ingreso que aún no entró).
  // Si no se especificó método, se toma como banco/transferencia por defecto.
  const movimientosPagados = movimientosRaw.filter(m => m.pagado)
  const movEfectivo = movimientosPagados
    .filter(m => m.metodo_pago === 'efectivo')
    .reduce((sum, m) => sum + (m.categoria === 'egreso' ? -(m.monto as number) : (m.monto as number)), 0)
  const movTransferencia = movimientosPagados
    .filter(m => m.metodo_pago !== 'efectivo')
    .reduce((sum, m) => sum + (m.categoria === 'egreso' ? -(m.monto as number) : (m.monto as number)), 0)

  const saldoEfectivo = totalEfectivo + movEfectivo
  const saldoTransferencia = totalTransferencia + movTransferencia

  // Mapear a tipos concretos para los componentes cliente
  const ventas = ventasRaw.map(v => ({
    id: v.id as string,
    producto: v.producto as string,
    cantidad: (v.cantidad as number) ?? 1,
    precio: v.precio as number,
    pagado: v.pagado as boolean,
    fecha_venta: v.fecha_venta instanceof Date
      ? v.fecha_venta.toISOString().substring(0, 10)
      : String(v.fecha_venta).substring(0, 10),
    metodo_pago: v.metodo_pago as string | null,
    cliente_id: v.cliente_id as string | null,
    cliente_nombre: v.cliente_nombre as string | null,
    cliente_telefono: v.cliente_telefono as string | null,
  }))

  const movimientos = movimientosRaw.map(m => ({
    id: m.id as string,
    descripcion: m.descripcion as string,
    monto: m.monto as number,
    categoria: m.categoria as string,
    metodo_pago: m.metodo_pago as string | null,
    etiqueta: m.etiqueta as string | null,
    pagado: m.pagado as boolean,
    fecha_limite_pago: m.fecha_limite_pago
      ? (m.fecha_limite_pago instanceof Date
          ? m.fecha_limite_pago.toISOString().substring(0, 10)
          : String(m.fecha_limite_pago).substring(0, 10))
      : null,
    fecha: m.fecha
      ? (m.fecha instanceof Date
          ? m.fecha.toISOString().substring(0, 10)
          : String(m.fecha).substring(0, 10))
      : null,
    created_at: m.created_at instanceof Date
      ? m.created_at.toISOString()
      : String(m.created_at),
  }))

  const clientes = clientesRaw.map(c => ({
    id: c.id as string,
    nombre: c.nombre as string,
  }))

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">Caja</h1>

      {/* ── Saldo por método de pago ───────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-3">Saldo</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">💵 Efectivo</p>
            <p className={`text-2xl font-bold ${saldoEfectivo >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${saldoEfectivo.toLocaleString('es-UY')}
            </p>
            <p className="text-slate-600 text-xs mt-1">ventas cobradas + movimientos</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">🏦 Banco / Transferencia</p>
            <p className={`text-2xl font-bold ${saldoTransferencia >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${saldoTransferencia.toLocaleString('es-UY')}
            </p>
            <p className="text-slate-600 text-xs mt-1">ventas cobradas + movimientos</p>
          </div>
        </div>
      </section>

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
        <VentasTable ventas={ventas} clientes={clientes} />
      </section>

      {/* ── Movimientos de caja ───────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-3">Movimientos de caja</h2>
        <MovimientosTable movimientos={movimientos} />
      </section>

    </div>
  )
}
