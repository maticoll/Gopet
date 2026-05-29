'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { guardarUbicacionCliente } from './actions'

type ClienteMapa = {
  id: string
  nombre: string
  direccion: string
  lat: number
  lng: number
  mascotas: {
    nombre: string
    producto: string
    diasRestantes: number | null
    fechaFin: string | null
  }[]
}

type ClienteSinUbicacion = { id: string; nombre: string }

export default function MapaClientes({
  clientes,
  sinUbicacion,
}: {
  clientes: ClienteMapa[]
  sinUbicacion: ClienteSinUbicacion[]
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<unknown>(null)

  const [modoPin, setModoPin] = useState(false)
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteSinUbicacion | null>(null)
  const [pinTemp, setPinTemp] = useState<{ lat: number; lng: number } | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [markerTempRef, setMarkerTempRef] = useState<unknown>(null)

  const urgentes = clientes.filter(c => c.mascotas.some(m => m.diasRestantes !== null && m.diasRestantes <= 3))
  const proximos = clientes.filter(c => c.mascotas.some(m => m.diasRestantes !== null && m.diasRestantes > 3 && m.diasRestantes <= 7))

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    import('leaflet').then(L => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(mapRef.current!).setView([-34.9011, -56.1645], 12)
      mapInstanceRef.current = map

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CartoDB',
      }).addTo(map)

      // Marcadores de clientes existentes
      for (const c of clientes) {
        const vals = c.mascotas.filter(m => m.diasRestantes !== null).map(m => m.diasRestantes!)
        const minDias = vals.length ? Math.min(...vals) : Infinity
        const urgente = minDias <= 3
        const proximo = minDias > 3 && minDias <= 7
        const color = urgente ? '#f87171' : proximo ? '#fb923c' : '#4ade80'

        const icon = L.divIcon({
          className: '',
          html: `<div style="width:16px;height:16px;background:${color};border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        })

        const mascotasHtml = c.mascotas.map(m => {
          const d = m.diasRestantes
          const col = d !== null && d <= 3 ? '#f87171' : d !== null && d <= 7 ? '#fb923c' : '#4ade80'
          const texto = d !== null ? (d >= 0 ? `${d}d restantes` : `Venció hace ${Math.abs(d)}d`) : 'Sin fecha'
          return `<div style="margin-top:4px;font-size:12px;color:#cbd5e1">🐾 ${m.nombre || '—'} · ${m.producto} <span style="color:${col};font-weight:600">${texto}</span></div>`
        }).join('')

        const popup = `<div style="min-width:200px;font-family:sans-serif">
          <a href="/dashboard/clientes/${c.id}" style="font-weight:700;font-size:14px;color:#1e293b;text-decoration:none">${c.nombre}</a>
          <div style="font-size:11px;color:#64748b;margin-top:2px">${c.direccion}</div>
          ${mascotasHtml}
        </div>`

        L.marker([c.lat, c.lng], { icon }).addTo(map).bindPopup(popup)
      }

      // Click en el mapa para pinchar ubicación
      map.on('click', (e: { latlng: { lat: number; lng: number } }) => {
        // Leer el estado actual desde el DOM (workaround para closure)
        const enModo = document.getElementById('modo-pin-flag')?.dataset.activo === '1'
        if (!enModo) return

        const { lat, lng } = e.latlng
        setPinTemp({ lat, lng })

        // Remover marcador temporal anterior
        setMarkerTempRef((prev: unknown) => {
          if (prev) (prev as { remove: () => void }).remove()
          const m = L.marker([lat, lng], {
            icon: L.divIcon({
              className: '',
              html: `<div style="width:20px;height:20px;background:#facc15;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.5)"></div>`,
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            })
          }).addTo(map)
          return m
        })
      })
    })

    return () => {
      if (mapInstanceRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(mapInstanceRef.current as any).remove()
        mapInstanceRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function guardar() {
    if (!clienteSeleccionado || !pinTemp) return
    setGuardando(true)
    await guardarUbicacionCliente(clienteSeleccionado.id, pinTemp.lat, pinTemp.lng)
    setGuardando(false)
    setModoPin(false)
    setClienteSeleccionado(null)
    setPinTemp(null)
    if (markerTempRef) (markerTempRef as { remove: () => void }).remove()
    setMarkerTempRef(null)
  }

  function cancelarPin() {
    setModoPin(false)
    setClienteSeleccionado(null)
    setPinTemp(null)
    if (markerTempRef) (markerTempRef as { remove: () => void }).remove()
    setMarkerTempRef(null)
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950">
      {/* Flag oculto para que el click handler del mapa sepa si está en modo pin */}
      <span id="modo-pin-flag" data-activo={modoPin ? '1' : '0'} className="hidden" />

      {/* Header */}
      <div className="px-6 py-4 flex items-center gap-4 border-b border-slate-800 shrink-0">
        <Link href="/dashboard" className="text-slate-400 hover:text-white transition-colors text-lg">←</Link>
        <h1 className="text-white font-bold text-xl flex-1">Mapa de clientes</h1>
        <div className="flex gap-4 text-xs items-center">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-400 inline-block"></span>
            <span className="text-slate-400">≤ 3 días ({urgentes.length})</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-orange-400 inline-block"></span>
            <span className="text-slate-400">≤ 7 días ({proximos.length})</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-green-400 inline-block"></span>
            <span className="text-slate-400">Al día</span>
          </span>
          {sinUbicacion.length > 0 && !modoPin && (
            <button
              onClick={() => setModoPin(true)}
              className="ml-2 text-xs bg-yellow-500 hover:bg-yellow-400 text-black font-semibold px-3 py-1.5 rounded transition-colors"
            >
              📍 Ubicar cliente ({sinUbicacion.length})
            </button>
          )}
        </div>
      </div>

      {/* Alertas urgentes */}
      {urgentes.length > 0 && (
        <div className="px-6 py-2 bg-red-950/40 border-b border-red-900/30 shrink-0">
          <p className="text-red-400 text-xs font-semibold">
            🚨 {urgentes.length} cliente{urgentes.length > 1 ? 's' : ''} con ≤ 3 días:{' '}
            {urgentes.map(c => c.nombre).join(', ')}
          </p>
        </div>
      )}

      {/* Panel modo pin */}
      {modoPin && (
        <div className="px-6 py-3 bg-yellow-950/40 border-b border-yellow-700/40 shrink-0 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 text-sm font-semibold">📍 Modo ubicación</span>
            <select
              value={clienteSeleccionado?.id ?? ''}
              onChange={e => {
                const c = sinUbicacion.find(x => x.id === e.target.value) ?? null
                setClienteSeleccionado(c)
                setPinTemp(null)
                if (markerTempRef) (markerTempRef as { remove: () => void }).remove()
                setMarkerTempRef(null)
              }}
              className="bg-slate-800 text-white rounded px-2 py-1 text-sm border border-slate-600"
            >
              <option value="">— Elegí el cliente —</option>
              {sinUbicacion.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
          {clienteSeleccionado && !pinTemp && (
            <span className="text-slate-400 text-sm">Tocá en el mapa donde vive <strong className="text-white">{clienteSeleccionado.nombre}</strong></span>
          )}
          {pinTemp && clienteSeleccionado && (
            <>
              <span className="text-slate-400 text-sm">
                📌 {pinTemp.lat.toFixed(5)}, {pinTemp.lng.toFixed(5)}
              </span>
              <button
                onClick={guardar}
                disabled={guardando}
                className="text-sm bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold px-3 py-1 rounded transition-colors"
              >
                {guardando ? 'Guardando…' : `Guardar ubicación de ${clienteSeleccionado.nombre}`}
              </button>
            </>
          )}
          <button onClick={cancelarPin} className="text-slate-400 hover:text-white text-sm ml-auto">
            Cancelar
          </button>
        </div>
      )}

      {/* Mapa */}
      <div className="flex-1 relative">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <div ref={mapRef} className="absolute inset-0" />
      </div>
    </div>
  )
}
