'use client'

import { useState } from 'react'
import { diasHastaFin } from '@/lib/calculations'
import { editarMascota, eliminarMascota, editarFechaFinBolsa, editarVenta, eliminarVenta } from './actions'

type Venta = {
  id: string
  producto: string
  precio: number
  fecha_venta: string
  fecha_estimada_fin: string | null
}

type Mascota = {
  id: string
  nombre: string
  especie: string
  tipo: string | null
  peso_kg: number | null
  ventas: Venta[]
}

export default function MascotaCard({
  mascota,
  clienteId,
}: {
  mascota: Mascota
  clienteId: string
}) {
  const [editando, setEditando] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editandoFecha, setEditandoFecha] = useState(false)
  const [savingFecha, setSavingFecha] = useState(false)

  const [form, setForm] = useState({
    nombre: mascota.nombre,
    especie: mascota.especie,
    tipo: mascota.tipo ?? '',
    peso_kg: mascota.peso_kg?.toString() ?? '',
  })

  // La venta más reciente es la primera (ORDER BY fecha_venta DESC)
  const ventaReciente = mascota.ventas[0] ?? null
  const [nuevaFecha, setNuevaFecha] = useState(ventaReciente?.fecha_estimada_fin ?? '')

  const dias = ventaReciente?.fecha_estimada_fin
    ? diasHastaFin(new Date(ventaReciente.fecha_estimada_fin))
    : null

  async function guardarMascota() {
    setSaving(true)
    await editarMascota(mascota.id, clienteId, {
      nombre: form.nombre,
      especie: form.especie,
      tipo: form.tipo || null,
      peso_kg: form.peso_kg ? Number(form.peso_kg) : null,
    })
    setSaving(false)
    setEditando(false)
  }

  async function confirmarEliminar() {
    setSaving(true)
    await eliminarMascota(mascota.id, clienteId)
  }

  async function guardarFecha() {
    setSavingFecha(true)
    await editarFechaFinBolsa(ventaReciente.id, clienteId, nuevaFecha || null)
    setSavingFecha(false)
    setEditandoFecha(false)
  }

  return (
    <div className="bg-slate-900 rounded-lg p-4 mb-4">
      {/* Cabecera mascota */}
      {editando ? (
        <div className="flex flex-wrap gap-2 mb-4 items-end">
          <div>
            <label className="text-slate-500 text-xs block mb-1">Nombre</label>
            <input
              type="text"
              value={form.nombre}
              onChange={e => setForm({ ...form, nombre: e.target.value })}
              className="bg-slate-800 text-white rounded px-2 py-1 text-sm border border-slate-600 w-32"
            />
          </div>
          <div>
            <label className="text-slate-500 text-xs block mb-1">Especie</label>
            <select
              value={form.especie}
              onChange={e => setForm({ ...form, especie: e.target.value })}
              className="bg-slate-800 text-white rounded px-2 py-1 text-sm border border-slate-600"
            >
              <option value="perro">🐶 Perro</option>
              <option value="gato">🐱 Gato</option>
            </select>
          </div>
          <div>
            <label className="text-slate-500 text-xs block mb-1">Tipo</label>
            <input
              type="text"
              value={form.tipo}
              onChange={e => setForm({ ...form, tipo: e.target.value })}
              placeholder="adulto, cachorro…"
              className="bg-slate-800 text-white rounded px-2 py-1 text-sm border border-slate-600 w-28"
            />
          </div>
          <div>
            <label className="text-slate-500 text-xs block mb-1">Peso (kg)</label>
            <input
              type="number"
              value={form.peso_kg}
              onChange={e => setForm({ ...form, peso_kg: e.target.value })}
              className="bg-slate-800 text-white rounded px-2 py-1 text-sm border border-slate-600 w-20"
            />
          </div>
          <div className="flex gap-2 mt-1">
            <button
              onClick={guardarMascota}
              disabled={saving}
              className="text-xs text-green-400 hover:text-green-300 border border-green-900 hover:border-green-700 px-3 py-1.5 rounded disabled:opacity-50 transition-colors"
            >
              {saving ? '…' : 'Guardar'}
            </button>
            <button
              onClick={() => setEditando(false)}
              className="text-xs text-slate-400 hover:text-slate-300 border border-slate-700 px-3 py-1.5 rounded transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-white font-semibold">
            {mascota.especie === 'perro' ? '🐶' : '🐱'} {mascota.nombre}
            <span className="text-slate-500 text-sm ml-2">
              ({mascota.peso_kg ? `${mascota.peso_kg}kg · ` : ''}{mascota.tipo ?? mascota.especie})
            </span>
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setEditando(true)}
              className="text-xs text-blue-400 hover:text-blue-300 border border-blue-900 hover:border-blue-700 px-2 py-1 rounded transition-colors"
            >
              Editar
            </button>
            {!eliminando ? (
              <button
                onClick={() => setEliminando(true)}
                className="text-xs text-red-400 hover:text-red-300 border border-red-900 hover:border-red-700 px-2 py-1 rounded transition-colors"
              >
                Eliminar
              </button>
            ) : (
              <div className="flex gap-1 items-center">
                <span className="text-xs text-slate-400">¿Seguro? Se borran todas las ventas.</span>
                <button
                  onClick={confirmarEliminar}
                  disabled={saving}
                  className="text-xs text-red-400 hover:text-red-300 border border-red-900 px-2 py-1 rounded disabled:opacity-50 transition-colors"
                >
                  {saving ? '…' : 'Sí, eliminar'}
                </button>
                <button
                  onClick={() => setEliminando(false)}
                  className="text-xs text-slate-400 border border-slate-700 px-2 py-1 rounded transition-colors"
                >
                  No
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Próximo fin de bolsa */}
      {ventaReciente && (
        <div className="bg-slate-800/60 rounded p-3 mb-3 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-slate-500 text-xs uppercase tracking-wide mb-0.5">Próximo fin de bolsa</p>
            {editandoFecha ? (
              <div className="flex flex-wrap gap-2 items-end mt-1">
                <div>
                  <label className="text-slate-500 text-xs block mb-1">Días que dura la ración</label>
                  <input
                    type="number"
                    min={1}
                    placeholder="ej: 45"
                    onChange={e => {
                      const dias = parseInt(e.target.value)
                      if (!isNaN(dias) && ventaReciente?.fecha_venta) {
                        const fecha = new Date(ventaReciente.fecha_venta + 'T12:00:00')
                        fecha.setDate(fecha.getDate() + dias)
                        setNuevaFecha(fecha.toISOString().split('T')[0])
                      }
                    }}
                    className="bg-slate-700 text-white rounded px-2 py-0.5 text-sm border border-slate-600 w-24"
                  />
                </div>
                <div>
                  <label className="text-slate-500 text-xs block mb-1">O elegí la fecha directo</label>
                  <input
                    type="date"
                    value={nuevaFecha}
                    onChange={e => setNuevaFecha(e.target.value)}
                    className="bg-slate-700 text-white rounded px-2 py-0.5 text-sm border border-slate-600"
                  />
                </div>
                {nuevaFecha && (
                  <p className="text-slate-400 text-xs self-end pb-1">
                    → {new Date(nuevaFecha + 'T12:00:00').toLocaleDateString('es-UY')}
                  </p>
                )}
                <button
                  onClick={guardarFecha}
                  disabled={savingFecha}
                  className="text-xs text-green-400 hover:text-green-300 border border-green-900 px-2 py-1.5 rounded disabled:opacity-50 transition-colors self-end"
                >
                  {savingFecha ? '…' : 'Guardar'}
                </button>
                <button
                  onClick={() => setEditandoFecha(false)}
                  className="text-xs text-slate-400 border border-slate-700 px-2 py-1.5 rounded transition-colors self-end"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className={`font-semibold text-sm ${
                  dias !== null && dias <= 3 ? 'text-red-400' :
                  dias !== null && dias <= 7 ? 'text-orange-400' :
                  'text-green-400'
                }`}>
                  {ventaReciente.fecha_estimada_fin
                    ? dias !== null
                      ? dias >= 0
                        ? `${dias}d restantes (${new Date(String(ventaReciente.fecha_estimada_fin).substring(0, 10) + 'T12:00:00').toLocaleDateString('es-UY')})`
                        : `Venció hace ${Math.abs(dias)}d`
                      : '—'
                    : <span className="text-slate-500">Sin fecha</span>
                  }
                </p>
                <button
                  onClick={() => setEditandoFecha(true)}
                  className="text-xs text-blue-400 hover:text-blue-300 border border-blue-900 hover:border-blue-700 px-2 py-0.5 rounded transition-colors"
                >
                  Editar
                </button>
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-slate-400 text-xs">{ventaReciente.producto}</p>
          </div>
        </div>
      )}

      {/* Historial de ventas */}
      <div className="space-y-2">
        {mascota.ventas.map((v) => (
          <VentaRow key={v.id} venta={v} clienteId={clienteId} />
        ))}
        {mascota.ventas.length === 0 && (
          <p className="text-slate-600 text-sm">Sin ventas registradas</p>
        )}
      </div>
    </div>
  )
}

function VentaRow({ venta: v, clienteId }: { venta: Venta; clienteId: string }) {
  const [editando, setEditando] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [saving, setSaving] = useState(false)
  const toDateStr = (val: unknown) => val ? String(val).substring(0, 10) : ''
  const [form, setForm] = useState({
    producto: v.producto,
    precio: v.precio?.toString() ?? '',
    fecha_venta: toDateStr(v.fecha_venta),
    fecha_estimada_fin: toDateStr(v.fecha_estimada_fin),
  })

  const d = v.fecha_estimada_fin ? diasHastaFin(new Date(v.fecha_estimada_fin)) : null

  async function guardar() {
    setSaving(true)
    await editarVenta(v.id, clienteId, {
      producto: form.producto,
      precio: Number(form.precio),
      fecha_venta: form.fecha_venta,
      fecha_estimada_fin: form.fecha_estimada_fin || null,
    })
    setSaving(false)
    setEditando(false)
  }

  async function confirmarEliminar() {
    setSaving(true)
    await eliminarVenta(v.id, clienteId)
  }

  if (editando) {
    return (
      <div className="bg-slate-800 rounded p-3 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2">
            <label className="text-slate-500 text-xs block mb-1">Producto</label>
            <input
              type="text"
              value={form.producto}
              onChange={e => setForm({ ...form, producto: e.target.value })}
              className="w-full bg-slate-700 text-white rounded px-2 py-1 text-sm border border-slate-600"
            />
          </div>
          <div>
            <label className="text-slate-500 text-xs block mb-1">Precio ($)</label>
            <input
              type="number"
              value={form.precio}
              onChange={e => setForm({ ...form, precio: e.target.value })}
              className="w-full bg-slate-700 text-white rounded px-2 py-1 text-sm border border-slate-600"
            />
          </div>
          <div>
            <label className="text-slate-500 text-xs block mb-1">Fecha venta</label>
            <input
              type="date"
              value={form.fecha_venta}
              onChange={e => setForm({ ...form, fecha_venta: e.target.value })}
              className="w-full bg-slate-700 text-white rounded px-2 py-1 text-sm border border-slate-600"
            />
          </div>
          <div className="col-span-2">
            <label className="text-slate-500 text-xs block mb-1">Fecha estimada fin de bolsa</label>
            <input
              type="date"
              value={form.fecha_estimada_fin}
              onChange={e => setForm({ ...form, fecha_estimada_fin: e.target.value })}
              className="w-full bg-slate-700 text-white rounded px-2 py-1 text-sm border border-slate-600"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={guardar} disabled={saving} className="text-xs text-green-400 hover:text-green-300 border border-green-900 px-3 py-1 rounded disabled:opacity-50 transition-colors">
            {saving ? '…' : 'Guardar'}
          </button>
          <button onClick={() => setEditando(false)} className="text-xs text-slate-400 border border-slate-700 px-3 py-1 rounded transition-colors">
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-800 rounded p-3 flex justify-between items-center gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm">{v.producto}</p>
        <p className="text-slate-400 text-xs">
          {v.fecha_venta ? new Date(String(v.fecha_venta).substring(0, 10) + 'T12:00:00').toLocaleDateString('es-UY') : 'Sin fecha'} · ${v.precio?.toLocaleString('es-UY')}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {v.fecha_estimada_fin && (
          <span className={`text-xs font-semibold ${d !== null && d <= 3 ? 'text-red-400' : d !== null && d <= 7 ? 'text-orange-400' : 'text-green-400'}`}>
            {d !== null ? (d >= 0 ? `${d}d` : `−${Math.abs(d)}d`) : ''}
          </span>
        )}
        <button onClick={() => setEditando(true)} className="text-xs text-blue-400 hover:text-blue-300 border border-blue-900 hover:border-blue-700 px-2 py-0.5 rounded transition-colors">
          Editar
        </button>
        {!eliminando ? (
          <button onClick={() => setEliminando(true)} className="text-xs text-red-400 hover:text-red-300 border border-red-900 hover:border-red-700 px-2 py-0.5 rounded transition-colors">
            ✕
          </button>
        ) : (
          <div className="flex gap-1 items-center">
            <span className="text-xs text-slate-400">¿Borrar?</span>
            <button onClick={confirmarEliminar} disabled={saving} className="text-xs text-red-400 border border-red-900 px-2 py-0.5 rounded disabled:opacity-50 transition-colors">
              {saving ? '…' : 'Sí'}
            </button>
            <button onClick={() => setEliminando(false)} className="text-xs text-slate-400 border border-slate-700 px-2 py-0.5 rounded transition-colors">
              No
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
