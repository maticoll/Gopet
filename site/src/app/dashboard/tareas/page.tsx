import { sql } from '@/lib/db'
import { TareasList } from './TareasList'

export const metadata = { title: 'Tareas — PetStock' }

export default async function TareasPage() {
  const rows = await sql`
    SELECT id, titulo, completada FROM tareas
    ORDER BY completada ASC, created_at DESC
  `

  const tareas = rows.map(r => ({
    id: r.id as string,
    titulo: r.titulo as string,
    completada: r.completada as boolean,
  }))

  const pendientes = tareas.filter(t => !t.completada)
  const hechas = tareas.filter(t => t.completada)

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold text-white">Tareas</h1>

      {tareas.length === 0 ? (
        <p className="text-slate-400 text-sm">No hay tareas todavía. Decile al bot "hay que hacer..." para agregar una.</p>
      ) : (
        <>
          {pendientes.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Pendientes ({pendientes.length})</p>
              <TareasList tareas={pendientes} />
            </div>
          )}
          {hechas.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Hechas ({hechas.length})</p>
              <TareasList tareas={hechas} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
