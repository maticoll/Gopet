'use client'

import { useState } from 'react'

type Campana = {
  id: string
  nombre: string
  estado: string
  objetivo: string
  presupuesto_diario: number | null
  gasto?: number
  impresiones?: number
  clics?: number
  alcance?: number
  cpm?: string
  ctr?: string
}

type Anuncio = {
  id: string
  nombre: string
  estado: string
  campana?: string
  gasto?: number
  impresiones?: number
  clics?: number
  alcance?: number
  cpm?: string
  ctr?: string
  thumbnail?: string | null
}

type Mensaje = { role: 'user' | 'assistant'; content: string }

export default function AgenteMetaClient({
  campanas,
  anuncios,
}: {
  campanas: Campana[]
  anuncios: Anuncio[]
}) {
  const [tab, setTab] = useState<'campanas' | 'anuncios' | 'chat'>('campanas')
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const totalGasto = campanas.reduce((s, c) => s + (c.gasto ?? 0), 0)
  const totalClics = campanas.reduce((s, c) => s + (c.clics ?? 0), 0)
  const totalImpresiones = campanas.reduce((s, c) => s + (c.impresiones ?? 0), 0)

  async function enviarMensaje() {
    if (!input.trim() || loading) return
    const userMsg: Mensaje = { role: 'user', content: input }
    const nuevoHistorial = [...mensajes, userMsg]
    setMensajes(nuevoHistorial)
    setInput('')
    setLoading(true)

    const res = await fetch('/api/meta/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mensaje: input,
        historial: mensajes.map(m => ({ role: m.role, content: m.content })),
      }),
    })
    const data = await res.json()
    setMensajes([...nuevoHistorial, { role: 'assistant', content: data.respuesta }])
    setLoading(false)
  }

  const estadoColor = (estado: string) =>
    estado === 'ACTIVE' ? 'text-green-400' : 'text-slate-500'

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Agente Meta</h1>
        <p className="text-slate-400 text-sm">Últimos 30 días</p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Gasto total</p>
          <p className="text-white text-2xl font-bold">${totalGasto.toLocaleString('es-UY', { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Impresiones</p>
          <p className="text-white text-2xl font-bold">{totalImpresiones.toLocaleString('es-UY')}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Clics</p>
          <p className="text-white text-2xl font-bold">{totalClics.toLocaleString('es-UY')}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 p-1 rounded-lg w-fit">
        {(['campanas', 'anuncios', 'chat'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
              tab === t ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t === 'campanas' ? 'Campañas' : t === 'anuncios' ? 'Anuncios' : '🤖 Chat'}
          </button>
        ))}
      </div>

      {/* Campañas */}
      {tab === 'campanas' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800">
                <th className="text-left py-2 pr-4">Campaña</th>
                <th className="text-left py-2 pr-4">Estado</th>
                <th className="text-right py-2 pr-4">Presup./día</th>
                <th className="text-right py-2 pr-4">Gasto 30d</th>
                <th className="text-right py-2 pr-4">Impresiones</th>
                <th className="text-right py-2 pr-4">CTR</th>
                <th className="text-right py-2">CPM</th>
              </tr>
            </thead>
            <tbody>
              {campanas.map(c => (
                <tr key={c.id} className="border-b border-slate-800/50">
                  <td className="py-2 pr-4 text-white font-medium max-w-[200px] truncate">{c.nombre}</td>
                  <td className={`py-2 pr-4 text-xs font-semibold ${estadoColor(c.estado)}`}>
                    {c.estado === 'ACTIVE' ? '● Activa' : '○ Pausada'}
                  </td>
                  <td className="py-2 pr-4 text-right text-slate-300">
                    {c.presupuesto_diario ? `$${c.presupuesto_diario}` : '—'}
                  </td>
                  <td className="py-2 pr-4 text-right text-white font-medium">
                    {c.gasto !== undefined ? `$${c.gasto.toFixed(0)}` : '—'}
                  </td>
                  <td className="py-2 pr-4 text-right text-slate-300">
                    {c.impresiones?.toLocaleString('es-UY') ?? '—'}
                  </td>
                  <td className="py-2 pr-4 text-right text-slate-300">{c.ctr ? `${c.ctr}%` : '—'}</td>
                  <td className="py-2 text-right text-slate-300">{c.cpm ? `$${c.cpm}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Anuncios */}
      {tab === 'anuncios' && (
        <div className="space-y-3">
          {anuncios.length === 0 && (
            <p className="text-slate-500 text-sm">Sin anuncios con datos en los últimos 30 días.</p>
          )}
          {anuncios.map(a => (
            <div key={a.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex gap-4 items-start">
              {a.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.thumbnail} alt="" className="w-16 h-16 rounded object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <p className="text-white font-medium text-sm truncate">{a.nombre}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{a.campana}</p>
                  </div>
                  <span className={`text-xs font-semibold shrink-0 ${estadoColor(a.estado)}`}>
                    {a.estado === 'ACTIVE' ? '● Activo' : '○ Pausado'}
                  </span>
                </div>
                {a.gasto !== undefined && (
                  <div className="grid grid-cols-4 gap-3 mt-3">
                    <div>
                      <p className="text-slate-500 text-xs">Gasto</p>
                      <p className="text-white text-sm font-semibold">${a.gasto.toFixed(0)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Impresiones</p>
                      <p className="text-white text-sm font-semibold">{Number(a.impresiones).toLocaleString('es-UY')}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">CTR</p>
                      <p className="text-white text-sm font-semibold">{a.ctr}%</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">CPM</p>
                      <p className="text-white text-sm font-semibold">${a.cpm}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Chat */}
      {tab === 'chat' && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg flex flex-col h-[500px]">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {mensajes.length === 0 && (
              <div className="text-slate-500 text-sm space-y-2">
                <p>Preguntame sobre tus campañas. Por ejemplo:</p>
                <ul className="space-y-1 text-slate-600">
                  <li>• "¿Cuál campaña está rindiendo mejor?"</li>
                  <li>• "¿Qué anuncio cambiarías primero?"</li>
                  <li>• "¿El CPM está bien para Uruguay?"</li>
                  <li>• "¿Qué creativo probarías para bajar el CPC?"</li>
                </ul>
              </div>
            )}
            {mensajes.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-100'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-800 text-slate-400 rounded-lg px-4 py-2 text-sm">Analizando…</div>
              </div>
            )}
          </div>
          <div className="border-t border-slate-800 p-3 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && enviarMensaje()}
              placeholder="Preguntá sobre tus anuncios…"
              className="flex-1 bg-slate-800 text-white rounded px-3 py-2 text-sm border border-slate-700 focus:outline-none focus:border-slate-500"
            />
            <button
              onClick={enviarMensaje}
              disabled={loading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
            >
              Enviar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
