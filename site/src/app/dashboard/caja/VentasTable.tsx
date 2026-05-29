'use client'

import { useState } from 'react'
import { editarVenta, marcarPagado } from './actions'

type Cliente = { id: string; nombre: string }

type Venta = {
  id: string
  producto: string
  cantidad: number
  precio: number
  pagado: boolean
  fecha_venta: string
  metodo_pago: string | null
  cliente_nombre: string | null
  cliente_id: string | null
  cliente_telefono: string | null
}

export default function VentasTable({
  ventas,
  clientes,
}: {
  ventas: Venta[]
  clientes: Cliente[]
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // form state
  const [form, setForm] = useState<{
    fecha_venta: string
    cliente_id: string
    producto: string
    precio: number
    cantidad: number
    pagado: boolean
    metodo_pago: string
  } | null>(null)

  function startEdit(v: Venta) {
    setEditingId(v.id)
    setForm({
      fecha_venta: v.fecha_venta,
      cliente_id: v.cliente_id ?? '',
      producto: v.producto,
      precio: v.precio,
      cantidad: v.cantidad ?? 1,
      pagado: v.pagado,
      metodo_pago: v.metodo_pago ?? 'efectivo',
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(null)
  }

  async function saveEdit(ventaId: string) {
    if (!form) return
    setSaving(true)
    await editarVenta(ventaId, {
      fecha_venta: form.fecha_venta,
      cliente_id: form.cliente_id,
      producto: form.producto,
      precio: form.precio,
      cantidad: form.cantidad,
      pagado: form.pagado,
      metodo_pago: form.metodo_pago || null,
    })
    setSaving(false)
    setEditingId(null)
    setForm(null)
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-slate-400 border-b border-slate-800">
            <th className="text-left py-2 pr-3">Fecha</th>
            <th className="text-left py-2 pr-3">Cliente</th>
            <th className="text-left py-2 pr-3">Producto</th>
            <th className="text-right py-2 pr-3">P/u</th>
            <th className="text-right py-2 pr-3">Cant.</th>
            <th className="text-right py-2 pr-3">Total</th>
            <th className="text-left py-2 pr-3">Estado</th>
            <th className="text-left py-2 pr-3">Método</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {ventas.map(v => {
            const isEditing = editingId === v.id
            const total = v.precio * (v.cantidad ?? 1)
            const metodoLabel = v.metodo_pago === 'efectivo' ? '💵' : v.metodo_pago === 'transferencia' ? '🏦' : ''

            if (isEditing && form) {
              const previewTotal = form.precio * form.cantidad
              return (
                <tr key={v.id} className="border-b border-slate-700 bg-slate-800/60">
                  <td className="py-2 pr-2">
                    <input
                      type="date"
                      value={form.fecha_venta}
                      onChange={e => setForm({ ...form, fecha_venta: e.target.value })}
                      className="bg-slate-700 text-white rounded px-1.5 py-0.5 text-xs w-28 border border-slate-600"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <select
                      value={form.cliente_id}
                      onChange={e => setForm({ ...form, cliente_id: e.target.value })}
                      className="bg-slate-700 text-white rounded px-1.5 py-0.5 text-xs border border-slate-600 max-w-[120px]"
                    >
                      <option value="">— sin cliente —</option>
                      {clientes.map(c => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="text"
                      value={form.producto}
                      onChange={e => setForm({ ...form, producto: e.target.value })}
                      className="bg-slate-700 text-white rounded px-1.5 py-0.5 text-xs w-32 border border-slate-600"
                    />
                  </td>
                  <td className="py-2 pr-2 text-right">
                    <input
                      type="number"
                      value={form.precio}
                      onChange={e => setForm({ ...form, precio: Number(e.target.value) })}
                      className="bg-slate-700 text-white rounded px-1.5 py-0.5 text-xs w-20 border border-slate-600 text-right"
                    />
                  </td>
                  <td className="py-2 pr-2 text-right">
                    <input
                      type="number"
                      min={1}
                      value={form.cantidad}
                      onChange={e => setForm({ ...form, cantidad: Number(e.target.value) })}
                      className="bg-slate-700 text-white rounded px-1.5 py-0.5 text-xs w-14 border border-slate-600 text-right"
                    />
                  </td>
                  <td className="py-2 pr-2 text-right text-slate-300 text-xs">
                    ${previewTotal.toLocaleString('es-UY')}
                  </td>
                  <td className="py-2 pr-2">
                    <select
                      value={form.pagado ? 'pagado' : 'pendiente'}
                      onChange={e => setForm({ ...form, pagado: e.target.value === 'pagado' })}
                      className="bg-slate-700 text-white rounded px-1.5 py-0.5 text-xs border border-slate-600"
                    >
                      <option value="pagado">Pagado</option>
                      <option value="pendiente">Pendiente</option>
                    </select>
                  </td>
                  <td className="py-2 pr-2">
                    <select
                      value={form.metodo_pago}
                      onChange={e => setForm({ ...form, metodo_pago: e.target.value })}
                      className="bg-slate-700 text-white rounded px-1.5 py-0.5 text-xs border border-slate-600"
                    >
                      <option value="efectivo">💵 Efectivo</option>
                      <option value="transferencia">🏦 Transfer</option>
                    </select>
                  </td>
                  <td className="py-2 whitespace-nowrap">
                    <button
                      onClick={() => saveEdit(v.id)}
                      disabled={saving}
                      className="text-xs text-green-400 hover:text-green-300 border border-green-900 hover:border-green-700 px-2 py-0.5 rounded mr-1 disabled:opacity-50 transition-colors"
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

            return (
              <tr key={v.id} className={`border-b border-slate-800/50 ${!v.pagado ? 'bg-red-950/30' : ''}`}>
                <td className="py-2 pr-3 text-slate-400">
                  {new Date(v.fecha_venta + 'T12:00:00').toLocaleDateString('es-UY')}
                </td>
                <td className="py-2 pr-3 text-white">{v.cliente_nombre ?? '—'}</td>
                <td className="py-2 pr-3 text-slate-300">{v.producto}</td>
                <td className="py-2 pr-3 text-right text-slate-400">${v.precio.toLocaleString('es-UY')}</td>
                <td className="py-2 pr-3 text-right text-slate-400">{v.cantidad ?? 1}</td>
                <td className="py-2 pr-3 text-right text-white">${total.toLocaleString('es-UY')}</td>
                <td className="py-2 pr-3">
                  {v.pagado ? (
                    <span className="text-green-400 text-xs">{metodoLabel} Pagado</span>
                  ) : (
                    <form action={marcarPagado.bind(null, v.id)} className="inline">
                      <button type="submit" className="text-xs text-yellow-400 hover:text-yellow-300 border border-yellow-900 hover:border-yellow-700 px-2 py-0.5 rounded transition-colors">
                        Marcar pagado
                      </button>
                    </form>
                  )}
                </td>
                <td className="py-2 pr-3 text-slate-400 text-xs">
                  {v.metodo_pago === 'efectivo' ? '💵 Efectivo' : v.metodo_pago === 'transferencia' ? '🏦 Transfer' : '—'}
                </td>
                <td className="py-2">
                  <button
                    onClick={() => startEdit(v)}
                    className="text-xs text-blue-400 hover:text-blue-300 border border-blue-900 hover:border-blue-700 px-2 py-0.5 rounded transition-colors"
                  >
                    Editar
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
