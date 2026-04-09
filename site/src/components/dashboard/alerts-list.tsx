interface Alerta {
  id: string
  clienteNombre: string
  mascotaNombre: string
  producto: string
  diasRestantes: number
}

function colorPorDias(dias: number) {
  if (dias <= 3) return { bg: 'bg-red-900', text: 'text-red-300', sub: 'text-red-400' }
  if (dias <= 7) return { bg: 'bg-orange-900', text: 'text-orange-200', sub: 'text-orange-400' }
  return { bg: 'bg-slate-800', text: 'text-green-300', sub: 'text-green-400' }
}

export function AlertsList({ alertas }: { alertas: Alerta[] }) {
  return (
    <div>
      <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Alertas activas</p>
      {alertas.length === 0 && (
        <p className="text-slate-600 text-xs">Sin alertas por ahora</p>
      )}
      <div className="flex flex-col gap-2">
        {alertas.map(a => {
          const c = colorPorDias(a.diasRestantes)
          return (
            <div key={a.id} className={`${c.bg} rounded p-2`}>
              <p className={`${c.text} text-xs font-semibold`}>
                {a.diasRestantes <= 7 ? '⚠' : '✓'} {a.mascotaNombre} ({a.clienteNombre})
              </p>
              <p className={`${c.sub} text-xs`}>
                {a.diasRestantes > 0
                  ? `Vence en ${a.diasRestantes} días`
                  : `Venció hace ${Math.abs(a.diasRestantes)} días`}
                {' — '}{a.producto}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
