'use client'

import { useTransition } from 'react'
import { toggleTarea } from './actions'

interface Tarea {
  id: string
  titulo: string
  completada: boolean
}

export function TareasList({ tareas }: { tareas: Tarea[] }) {
  return (
    <ul className="space-y-2">
      {tareas.map(t => (
        <TareaItem key={t.id} tarea={t} />
      ))}
    </ul>
  )
}

function TareaItem({ tarea }: { tarea: { id: string; titulo: string; completada: boolean } }) {
  const [pending, startTransition] = useTransition()

  return (
    <li className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-lg px-4 py-3">
      <button
        onClick={() => startTransition(() => toggleTarea(tarea.id, !tarea.completada))}
        disabled={pending}
        className="flex-shrink-0 w-6 h-6 rounded-full border-2 transition-colors flex items-center justify-center"
        style={{
          borderColor: tarea.completada ? '#f59e0b' : '#64748b',
          backgroundColor: tarea.completada ? '#f59e0b' : 'transparent',
          opacity: pending ? 0.5 : 1,
        }}
        aria-label={tarea.completada ? 'Marcar como pendiente' : 'Marcar como hecho'}
      >
        {tarea.completada && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <span
        className="text-sm flex-1"
        style={{
          color: tarea.completada ? '#64748b' : '#e2e8f0',
          textDecoration: tarea.completada ? 'line-through' : 'none',
        }}
      >
        {tarea.titulo}
      </span>
    </li>
  )
}
