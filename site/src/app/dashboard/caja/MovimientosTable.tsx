'use client'

import { useState, useTransition } from 'react'
import { editarMovimiento, marcarMovimientoPagado, eliminarMovimiento } from './actions'

type Movimiento = {
  id: string
  descripcion: string
  monto: number
  categoria: string
  metodo_pago: string | null
  etiqueta: string | null
  pagado: boolean
  fecha_limite_pago: string | null
  fecha: string | null
  created_at: string
}

// Fecha a mostrar: la del gasto/ingreso (fecha) o, si falta, el momento de registro
function fechaMostrar(m: Movimiento): string {
  if (m.fecha) return new Date(m.fecha + 'T12:00:00').toLocaleDateString('es-UY')
  return new Date(m.created_at).toLocaleDateString('es-UY')
}

const ETIQUETAS = ['Meta Ads', 'Compra stock', 'Nafta']

export default function MovimientosTable({ movimientos }: { movimientos: Movimiento[] }) {
  const [filtroEtiqueta, setFiltroEtiqueta] = useState<string>('todas')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [pagandoId, setPagandoId] = useState<string | null>(null)
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function handleEliminar(id: string) {
    if (!confirm('¿Eliminar este movimiento? Esta acción no se puede deshacer.')) return
    setEliminandoId(id)
    startTransition(async () => {
      await eliminarMovimiento(id)
      setEliminandoId(null)
    })
  }

  function handleMarcarPagado(id: string) {
    setPagandoId(id)
    startTransition(async () => {
      await marcarMovimientoPagado(id)
      setPagandoId(null)
    })
  }
  const [form, setForm] = useState<{
    fecha: string
    descripcion: string
    monto: number
    categoria: string
    metodo_pago: string
    etiqueta: string
  } | null>(null)

  function startEdit(m: Movimiento) {
    setEditingId(m.id)
    setForm({
      fecha: m.fecha ?? (m.created_at ? m.created_at.substring(0, 10) : ''),
      descripcion: m.descripcion,
      monto: m.monto,
      categoria: m.categoria,
      metodo_pago: m.metodo_pago ?? 'efectivo',
      etiqueta: m.etiqueta ?? '',
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(null)
  }

  async function saveEdit(id: string) {
    if (!form) return
    setSaving(true)
    await editarMovimiento(id, {
      fecha: form.fecha,
      descripcion: form.descripcion,
      monto: form.monto,
      categoria: form.categoria,
      metodo_pago: form.metodo_pago || null,
      etiqueta: form.etiqueta || null,
    })
    setSaving(false)
    setEditingId(null)
    setForm(null)
  }

  const movimientosFiltrados = filtroEtiqueta === 'todas'
    ? movimientos
    : movimientos.filter(m => m.etiqueta === filtroEtiqueta)

  if (movimientos.length === 0) {
    return <p className="text-slate-500 text-sm">Sin movimientos registrados. Mandá un mensaje al bot de Telegram con tus gastos o ingresos.</p>
  }

  return (
    <div className="space-y-3">
      {/* Filtro por etiqueta */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFiltroEtiqueta('todas')}
          className={`text-xs px-3 py-1 rounded-full border transition-colors ${
            filtroEtiqueta === 'todas'
              ? 'bg-slate-600 border-slate-500 text-white'
              : 'border-slate-700 text-slate-400 hover:border-slate-500'
          }`}
        >
          Todos
        </button>
        {ETIQUETAS.map(e => (
          <button
            key={e}
            onClick={() => setFiltroEtiqueta(e)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              filtroEtiqueta === e
                ? 'bg-slate-600 border-slate-500 text-white'
                : 'border-slate-700 text-slate-400 hover:border-slate-500'
            }`}
          >
            🏷️ {e}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-400 border-b border-slate-800">
              <th className="text-left py-2 pr-4 w-10">#</th>
              <th className="text-left py-2 pr-4">Fecha</th>
              <th className="text-left py-2 pr-4">Descripción</th>
              <th className="text-left py-2 pr-4">Etiqueta</th>
              <th className="text-left py-2 pr-4">Tipo</th>
              <th className="text-left py-2 pr-4">Método</th>
              <th className="text-left py-2 pr-4">Pago</th>
              <th className="text-right py-2 pr-4">Monto</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {movimientosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-6 text-center text-slate-500 text-sm">
                  No hay movimientos con la etiqueta "{filtroEtiqueta}"
                </td>
              </tr>
            ) : (
              movimientosFiltrados.map((m, i) => {
                const isEditing = editingId === m.id

                if (isEditing && form) {
                  return (
                    <tr key={m.id} className="border-b border-slate-700 bg-slate-800/60">
                      <td className="py-2 pr-4 text-slate-500 tabular-nums">{i + 1}</td>
                      <td className="py-2 pr-4">
                        <input
                          type="date"
                          value={form.fecha}
                          onChange={e => setForm({ ...form, fecha: e.target.value })}
                          className="bg-slate-700 text-white rounded px-1.5 py-0.5 text-xs w-28 border border-slate-600"
                        />
                      </td>
                      <td className="py-2 pr-4">
                        <input
                          type="text"
                          value={form.descripcion}
                          onChange={e => setForm({ ...form, descripcion: e.target.value })}
                          className="bg-slate-700 text-white rounded px-1.5 py-0.5 text-xs w-36 border border-slate-600"
                        />
                      </td>
                      <td className="py-2 pr-4">
                        <select
                          value={form.etiqueta}
                          onChange={e => setForm({ ...form, etiqueta: e.target.value })}
                          className="bg-slate-700 text-white rounded px-1.5 py-0.5 text-xs border border-slate-600"
                        >
                          <option value="">— sin etiqueta —</option>
                          {ETIQUETAS.map(e => (
                            <option key={e} value={e}>{e}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 pr-4">
                        <select
                          value={form.categoria}
                          onChange={e => setForm({ ...form, categoria: e.target.value })}
                          className="bg-slate-700 text-white rounded px-1.5 py-0.5 text-xs border border-slate-600"
                        >
                          <option value="ingreso">💰 Ingreso</option>
                          <option value="egreso">💸 Egreso</option>
                        </select>
                      </td>
                      <td className="py-2 pr-4">
                        <select
                          value={form.metodo_pago}
                          onChange={e => setForm({ ...form, metodo_pago: e.target.value })}
                          className="bg-slate-700 text-white rounded px-1.5 py-0.5 text-xs border border-slate-600"
                        >
                          <option value="efectivo">💵 Efectivo</option>
                          <option value="transferencia">🏦 Transfer</option>
                        </select>
                      </td>
                      <td className="py-2 pr-4 text-slate-500 text-xs">—</td>
                      <td className="py-2 pr-4 text-right">
                        <input
                          type="number"
                          value={form.monto}
                          onChange={e => setForm({ ...form, monto: Number(e.target.value) })}
                          className="bg-slate-700 text-white rounded px-1.5 py-0.5 text-xs w-24 border border-slate-600 text-right"
                        />
                      </td>
                      <td className="py-2 whitespace-nowrap flex gap-1">
                        <button
                          onClick={() => saveEdit(m.id)}
                          disabled={saving}
                          className="text-xs text-green-400 hover:text-green-300 border border-green-900 hover:border-green-700 px-2 py-0.5 rounded disabled:opacity-50 transition-colors"
                        >
                          {saving ? '…' : 'Guardar'}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-xs text-slate-400 hover:text-slate-300 border border-slate-700 hover:border-slate-500 px-2 py-0.5 rounded transition-colors"
                        >
                          Cancelar
                        </button>
                      </td>
                    </tr>
                  )
                }

                const esEgreso = m.categoria === 'egreso'
                const metodo = m.metodo_pago === 'efectivo' ? '💵 Efectivo' : '🏦 Transfer'
                return (
                  <tr key={m.id} className="border-b border-slate-800/50">
                    <td className="py-2 pr-4 text-slate-500 tabular-nums">{i + 1}</td>
                    <td className="py-2 pr-4 text-slate-400">
                      {fechaMostrar(m)}
                    </td>
                    <td className="py-2 pr-4 text-white">
                      {esEgreso ? '💸' : '💰'} {m.descripcion}
                    </td>
                    <td className="py-2 pr-4">
                      {m.etiqueta ? (
                        <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
                          🏷️ {m.etiqueta}
                        </span>
                      ) : (
                        <span className="text-slate-600 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-slate-400 text-xs">
                      {esEgreso ? 'Egreso' : 'Ingreso'}
                    </td>
                    <td className="py-2 pr-4 text-slate-400 text-xs">{metodo}</td>
                    <td className="py-2 pr-4 text-xs">
                      {m.pagado ? (
                        <span className="text-green-400">✅ Pagado</span>
                      ) : (
                        <div className="flex flex-col gap-1 items-start">
                          <span className="text-orange-400 font-medium">⏳ No pagado</span>
                          {m.fecha_limite_pago && (
                            <span className="text-slate-500">
                              vence {new Date(m.fecha_limite_pago + 'T12:00:00').toLocaleDateString('es-UY')}
                            </span>
                          )}
                          <button
                            onClick={() => handleMarcarPagado(m.id)}
                            disabled={pagandoId === m.id}
                            className="text-green-400 hover:text-green-300 border border-green-900 hover:border-green-700 px-2 py-0.5 rounded disabled:opacity-50 transition-colors"
                          >
                            {pagandoId === m.id ? '…' : 'Marcar pagado'}
                          </button>
                        </div>
                      )}
                    </td>
                    <td className={`py-2 pr-4 text-right font-medium ${esEgreso ? 'text-red-400' : 'text-green-400'}`}>
                      {esEgreso ? '-' : '+'}${m.monto.toLocaleString('es-UY')}
                    </td>
                    <td className="py-2 whitespace-nowrap flex gap-1">
                      <button
                        onClick={() => startEdit(m)}
                        className="text-xs text-blue-400 hover:text-blue-300 border border-blue-900 hover:border-blue-700 px-2 py-0.5 rounded transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleEliminar(m.id)}
                        disabled={eliminandoId === m.id}
                        className="text-xs text-red-400 hover:text-red-300 border border-red-900 hover:border-red-700 px-2 py-0.5 rounded disabled:opacity-50 transition-colors"
                      >
                        {eliminandoId === m.id ? '…' : 'Borrar'}
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
