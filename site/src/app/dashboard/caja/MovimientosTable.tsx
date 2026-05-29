'use client'

import { useState } from 'react'
import { editarMovimiento } from './actions'

type Movimiento = {
  id: string
  descripcion: string
  monto: number
  categoria: string
  metodo_pago: string | null
  created_at: string
}

export default function MovimientosTable({ movimientos }: { movimientos: Movimiento[] }) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<{
    descripcion: string
    monto: number
    categoria: string
    metodo_pago: string
  } | null>(null)

  function startEdit(m: Movimiento) {
    setEditingId(m.id)
    setForm({
      descripcion: m.descripcion,
      monto: m.monto,
      categoria: m.categoria,
      metodo_pago: m.metodo_pago ?? 'efectivo',
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
      descripcion: form.descripcion,
      monto: form.monto,
      categoria: form.categoria,
      metodo_pago: form.metodo_pago || null,
    })
    setSaving(false)
    setEditingId(null)
    setForm(null)
  }

  if (movimientos.length === 0) {
    return <p className="text-slate-500 text-sm">Sin movimientos registrados. Mandá un mensaje al bot de Telegram con tus gastos o ingresos.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-slate-400 border-b border-slate-800">
            <th className="text-left py-2 pr-4">Fecha</th>
            <th className="text-left py-2 pr-4">Descripción</th>
            <th className="text-left py-2 pr-4">Tipo</th>
            <th className="text-left py-2 pr-4">Método</th>
            <th className="text-right py-2 pr-4">Monto</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {movimientos.map(m => {
            const isEditing = editingId === m.id

            if (isEditing && form) {
              return (
                <tr key={m.id} className="border-b border-slate-700 bg-slate-800/60">
                  <td className="py-2 pr-4 text-slate-400 text-xs">
                    {new Date(m.created_at).toLocaleDateString('es-UY')}
                  </td>
                  <td className="py-2 pr-4">
                    <input
                      type="text"
                      value={form.descripcion}
                      onChange={e => setForm({ ...form, descripcion: e.target.value })}
                      className="bg-slate-700 text-white rounded px-1.5 py-0.5 text-xs w-40 border border-slate-600"
                    />
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
                  <td className="py-2 pr-4 text-right">
                    <input
                      type="number"
                      value={form.monto}
                      onChange={e => setForm({ ...form, monto: Number(e.target.value) })}
                      className="bg-slate-700 text-white rounded px-1.5 py-0.5 text-xs w-24 border border-slate-600 text-right"
                    />
                  </td>
                  <td className="py-2 whitespace-nowrap">
                    <button
                      onClick={() => saveEdit(m.id)}
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

            const esEgreso = m.categoria === 'egreso'
            const metodo = m.metodo_pago === 'efectivo' ? '💵 Efectivo' : m.metodo_pago === 'transferencia' ? '🏦 Transfer' : '—'
            return (
              <tr key={m.id} className="border-b border-slate-800/50">
                <td className="py-2 pr-4 text-slate-400">
                  {new Date(m.created_at).toLocaleDateString('es-UY')}
                </td>
                <td className="py-2 pr-4 text-white">
                  {esEgreso ? '💸' : '💰'} {m.descripcion}
                </td>
                <td className="py-2 pr-4 text-slate-400 text-xs">
                  {esEgreso ? 'Egreso' : 'Ingreso'}
                </td>
                <td className="py-2 pr-4 text-slate-400 text-xs">{metodo}</td>
                <td className={`py-2 pr-4 text-right font-medium ${esEgreso ? 'text-red-400' : 'text-green-400'}`}>
                  {esEgreso ? '-' : '+'}${m.monto.toLocaleString('es-UY')}
                </td>
                <td className="py-2">
                  <button
                    onClick={() => startEdit(m)}
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
