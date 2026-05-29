'use client'

import { useState } from 'react'
import { editarStock } from './actions'

type Producto = {
  nombre: string
  marca: string
  stock_actual: number
}

export default function StockTable({ productos }: { productos: Producto[] }) {
  const [editingNombre, setEditingNombre] = useState<string | null>(null)
  const [stockValue, setStockValue] = useState<number>(0)
  const [saving, setSaving] = useState(false)

  function startEdit(p: Producto) {
    setEditingNombre(p.nombre)
    setStockValue(p.stock_actual)
  }

  function cancelEdit() {
    setEditingNombre(null)
  }

  async function saveEdit(nombre: string) {
    setSaving(true)
    await editarStock(nombre, stockValue)
    setSaving(false)
    setEditingNombre(null)
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-slate-400 border-b border-slate-800">
            <th className="text-left py-2 pr-4">Marca</th>
            <th className="text-left py-2 pr-4">Producto</th>
            <th className="text-right py-2 pr-4">Stock</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {productos.map(p => {
            const isEditing = editingNombre === p.nombre

            if (isEditing) {
              return (
                <tr key={p.nombre} className="border-b border-slate-700 bg-slate-800/60">
                  <td className="py-2 pr-4 text-slate-400">{p.marca}</td>
                  <td className="py-2 pr-4 text-white">{p.nombre}</td>
                  <td className="py-2 pr-4 text-right">
                    <input
                      type="number"
                      min={0}
                      value={stockValue}
                      onChange={e => setStockValue(Number(e.target.value))}
                      className="bg-slate-700 text-white rounded px-1.5 py-0.5 text-xs w-20 border border-slate-600 text-right"
                    />
                  </td>
                  <td className="py-2 whitespace-nowrap">
                    <button
                      onClick={() => saveEdit(p.nombre)}
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

            const bajo = p.stock_actual <= 2
            const sinStock = p.stock_actual <= 0
            return (
              <tr key={p.nombre} className="border-b border-slate-800/50">
                <td className="py-2 pr-4 text-slate-400">{p.marca}</td>
                <td className="py-2 pr-4 text-white">{p.nombre}</td>
                <td className="py-2 pr-4 text-right">
                  {sinStock ? (
                    <span className="text-red-400 font-medium">Sin stock</span>
                  ) : bajo ? (
                    <span className="text-orange-400 font-medium">⚠️ {p.stock_actual}</span>
                  ) : (
                    <span className="text-slate-300">{p.stock_actual}</span>
                  )}
                </td>
                <td className="py-2">
                  <button
                    onClick={() => startEdit(p)}
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
