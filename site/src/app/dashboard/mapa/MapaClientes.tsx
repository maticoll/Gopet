'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'

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

export default function MapaClientes({ clientes }: { clientes: ClienteMapa[] }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<unknown>(null)

  const urgentes = clientes.filter(c => c.mascotas.some(m => m.diasRestantes !== null && m.diasRestantes <= 3))
  const proximos = clientes.filter(c => c.mascotas.some(m => m.diasRestantes !== null && m.diasRestantes > 3 && m.diasRestantes <= 7))

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    import('leaflet').then(L => {
      // Fix default icon
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(mapRef.current!).setView([-34.9011, -56.1645], 12)
      mapInstanceRef.current = map

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CartoDB',
      }).addTo(map)

      for (const c of clientes) {
        const minDias = Math.min(...c.mascotas.filter(m => m.diasRestantes !== null).map(m => m.diasRestantes!))
        const urgente = minDias <= 3
        const proximo = minDias > 3 && minDias <= 7

        const color = urgente ? '#f87171' : proximo ? '#fb923c' : '#4ade80'
        const pulso = urgente ? 'animation: pulse 1.5s infinite;' : ''

        const icon = L.divIcon({
          className: '',
          html: `<div style="
            width: 16px; height: 16px;
            background: ${color};
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.4);
            ${pulso}
          "></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        })

        const mascotasHtml = c.mascotas.map(m => {
          const d = m.diasRestantes
          const color = d !== null && d <= 3 ? '#f87171' : d !== null && d <= 7 ? '#fb923c' : '#4ade80'
          const texto = d !== null ? (d >= 0 ? `${d}d restantes` : `Venció hace ${Math.abs(d)}d`) : 'Sin fecha'
          return `<div style="margin-top:4px; font-size:12px; color:#cbd5e1">
            🐾 ${m.nombre || '—'} · ${m.producto}
            <span style="color:${color}; font-weight:600; margin-left:4px">${texto}</span>
          </div>`
        }).join('')

        const popup = `
          <div style="min-width:200px; font-family:sans-serif">
            <a href="/dashboard/clientes/${c.id}" style="font-weight:700; font-size:14px; color:#1e293b; text-decoration:none">
              ${c.nombre}
            </a>
            <div style="font-size:11px; color:#64748b; margin-top:2px">${c.direccion}</div>
            ${mascotasHtml}
          </div>
        `

        L.marker([c.lat, c.lng], { icon })
          .addTo(map)
          .bindPopup(popup)
      }
    })

    return () => {
      if (mapInstanceRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(mapInstanceRef.current as any).remove()
        mapInstanceRef.current = null
      }
    }
  }, [clientes])

  return (
    <div className="flex flex-col h-screen bg-slate-950">
      {/* Header */}
      <div className="px-6 py-4 flex items-center gap-4 border-b border-slate-800 shrink-0">
        <Link href="/dashboard" className="text-slate-400 hover:text-white transition-colors text-lg">←</Link>
        <h1 className="text-white font-bold text-xl flex-1">Mapa de clientes</h1>
        <div className="flex gap-4 text-xs">
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

      {/* Mapa */}
      <div className="flex-1 relative">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <div ref={mapRef} className="absolute inset-0" />
      </div>
    </div>
  )
}
