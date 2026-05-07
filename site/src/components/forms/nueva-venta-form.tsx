'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { calcularFechaFinPerro, calcularFechaFinGato } from '@/lib/calculations'
import { Button } from '@/components/ui/button'
import { registrarVentaAction } from './nueva-venta-actions'

export function NuevaVentaForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [especie, setEspecie] = useState<'perro' | 'gato'>('perro')
  const [form, setForm] = useState({
    clienteNombre: '', clienteTelefono: '', clienteDireccion: '',
    mascotaNombre: '', mascotaPeso: '', tipoPerro: 'adulto',
    producto: '', tamañoBolsaKg: '', precio: '',
    gramosPorComida: '', vecesAlDia: '2',
    intervaloDias: '', fechaManual: '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function calcularFechaEstimada(): string | null {
    if (especie === 'perro') {
      if (!form.tamañoBolsaKg || !form.gramosPorComida || !form.vecesAlDia) return null
      const fecha = calcularFechaFinPerro(new Date(), parseFloat(form.tamañoBolsaKg), parseInt(form.gramosPorComida), parseInt(form.vecesAlDia))
      return fecha.toISOString().split('T')[0]
    } else {
      if (form.intervaloDias) {
        return calcularFechaFinGato(new Date(), parseInt(form.intervaloDias)).toISOString().split('T')[0]
      }
      if (form.fechaManual) return form.fechaManual
      return null
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const fechaEstimada = calcularFechaEstimada()
      const result = await registrarVentaAction({
        clienteNombre:    form.clienteNombre,
        clienteTelefono:  form.clienteTelefono || null,
        clienteDireccion: form.clienteDireccion || null,
        mascotaNombre:    form.mascotaNombre,
        mascotaPeso:      parseFloat(form.mascotaPeso) || null,
        especie,
        tipoPerro:        especie === 'perro' ? form.tipoPerro : null,
        producto:         form.producto,
        tamañoBolsaKg:    parseFloat(form.tamañoBolsaKg),
        precio:           parseInt(form.precio),
        gramosPorComida:  especie === 'perro' ? (parseInt(form.gramosPorComida) || null) : null,
        vecesAlDia:       especie === 'perro' ? parseInt(form.vecesAlDia) : null,
        intervaloDias:    especie === 'gato' ? (parseInt(form.intervaloDias) || null) : null,
        fechaEstimadaFin: fechaEstimada,
      })

      if (!result.success) {
        setError(result.error ?? 'Error al guardar la venta.')
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      console.error(err)
      setError('Error al guardar la venta. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const fechaEstimada = calcularFechaEstimada()

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {/* Cliente */}
      <section className="bg-slate-900 rounded-lg p-5 space-y-3">
        <h3 className="text-white font-semibold">Datos del cliente</h3>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              { label: 'Nombre y apellido *', field: 'clienteNombre', required: true },
              { label: 'Teléfono', field: 'clienteTelefono', required: false },
            ] as Array<{ label: string; field: keyof typeof form; required: boolean }>
          ).map(({ label, field, required }) => (
            <div key={field}>
              <label className="block text-xs text-slate-400 mb-1">{label}</label>
              <input value={form[field]} onChange={e => set(field, e.target.value)} required={required}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500" />
            </div>
          ))}
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Dirección</label>
          <input value={form.clienteDireccion} onChange={e => set('clienteDireccion', e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500" />
        </div>
      </section>

      {/* Mascota */}
      <section className="bg-slate-900 rounded-lg p-5 space-y-3">
        <h3 className="text-white font-semibold">Datos de la mascota</h3>
        <div className="flex gap-3 mb-2">
          {(['perro', 'gato'] as const).map(e => (
            <button key={e} type="button" onClick={() => setEspecie(e)}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                especie === e ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}>
              {e === 'perro' ? '🐶 Perro' : '🐱 Gato'}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Nombre de la mascota *</label>
            <input value={form.mascotaNombre} onChange={e => set('mascotaNombre', e.target.value)} required
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Peso (kg)</label>
            <input type="number" step="0.1" value={form.mascotaPeso} onChange={e => set('mascotaPeso', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500" />
          </div>
          {especie === 'perro' && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">Tipo</label>
              <select value={form.tipoPerro} onChange={e => set('tipoPerro', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-300 text-sm focus:outline-none">
                <option value="adulto">Adulto</option>
                <option value="senior">Senior</option>
                <option value="cachorro">Cachorro</option>
                <option value="raza_pequeña">Raza pequeña</option>
              </select>
            </div>
          )}
        </div>
      </section>

      {/* Venta */}
      <section className="bg-slate-900 rounded-lg p-5 space-y-3">
        <h3 className="text-white font-semibold">Datos de la venta</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Producto *</label>
            <input value={form.producto} onChange={e => set('producto', e.target.value)} required placeholder="Ej: Maxiene 15kg"
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Tamaño bolsa (kg) *</label>
            <input type="number" step="0.5" value={form.tamañoBolsaKg} onChange={e => set('tamañoBolsaKg', e.target.value)} required
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Precio ($) *</label>
            <input type="number" value={form.precio} onChange={e => set('precio', e.target.value)} required
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500" />
          </div>
        </div>

        {especie === 'perro' && (
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Gramos por comida</label>
              <input type="number" value={form.gramosPorComida} onChange={e => set('gramosPorComida', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Veces al día</label>
              <select value={form.vecesAlDia} onChange={e => set('vecesAlDia', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-300 text-sm focus:outline-none">
                <option value="1">1 vez</option>
                <option value="2">2 veces</option>
                <option value="3">3 veces</option>
              </select>
            </div>
          </div>
        )}

        {especie === 'gato' && (
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Días estimados hasta próxima compra</label>
              <input type="number" value={form.intervaloDias} onChange={e => set('intervaloDias', e.target.value)} placeholder="Ej: 30"
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">O fecha exacta (opcional)</label>
              <input type="date" value={form.fechaManual} onChange={e => set('fechaManual', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500" />
            </div>
          </div>
        )}

        {fechaEstimada && (
          <div className="bg-amber-950 border border-amber-800 rounded p-3 mt-2">
            <p className="text-amber-300 text-sm">
              📅 Fecha estimada fin de bolsa: <strong>{new Date(fechaEstimada).toLocaleDateString('es-UY')}</strong>
            </p>
          </div>
        )}
      </section>

      {error && (
        <div className="bg-red-950 border border-red-800 rounded p-3 text-red-300 text-sm">{error}</div>
      )}

      <Button type="submit" disabled={loading} className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold">
        {loading ? 'Guardando...' : 'Registrar venta'}
      </Button>
    </form>
  )
}
