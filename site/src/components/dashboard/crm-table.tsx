'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { eliminarClienteConVentas } from '@/app/dashboard/actions'

interface MascotaRow {
  mascotaId: string
  mascotaNombre: string
  especie: 'perro' | 'gato'
  mascotaPeso: number | null
  producto: string | null
  fechaFin: string | null
  diasRestantes: number | null
}

interface ClienteRow {
  clienteId: string
  clienteNombre: string
  direccion: string | null
  mascotas: MascotaRow[]
  proximosDias: number | null
}

function colorDias(dias: number | null) {
  if (dias === null) return 'text-slate-500'
  if (dias <= 3) return 'text-red-400 font-bold'
  if (dias <= 7) return 'text-orange-400 font-semibold'
  return 'text-green-400'
}

export function CrmTable({ clientes }: { clientes: ClienteRow[] }) {
  const [busqueda, setBusqueda] = useState('')
  const [filtroEspecie, setFiltroEspecie] = useState<'todos' | 'perro' | 'gato'>('todos')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleDelete = (clienteId: string) => {
    startTransition(async () => {
      const result = await eliminarClienteConVentas(clienteId)
      if (result.success) {
        setDeletingId(null)
        router.refresh()
      }
    })
  }

  const filtrados = clientes.filter(c => {
    const matchBusqueda =
      c.clienteNombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.mascotas.some(m => m.mascotaNombre.toLowerCase().includes(busqueda.toLowerCase()))
    const matchEspecie =
      filtroEspecie === 'todos' ||
      c.mascotas.some(m => m.especie === filtroEspecie)
    return matchBusqueda && matchEspecie
  })

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <h2 className="text-white font-semibold text-lg">Clientes</h2>
        <div className="flex gap-2">
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar cliente o mascota..."
            className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-white text-sm flex-1 sm:w-52 focus:outline-none focus:border-amber-500"
          />
          <select
            value={filtroEspecie}
            onChange={e => setFiltroEspecie(e.target.value as 'todos' | 'perro' | 'gato')}
            className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-slate-300 text-sm focus:outline-none"
          >
            <option value="todos">Todos</option>
            <option value="perro">Perros</option>
            <option value="gato">Gatos</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left text-slate-500 font-medium py-2 px-3 text-xs uppercase tracking-wide">Cliente</th>
              <th className="text-left text-slate-500 font-medium py-2 px-3 text-xs uppercase tracking-wide hidden sm:table-cell">Mascotas</th>
              <th className="text-left text-slate-500 font-medium py-2 px-3 text-xs uppercase tracking-wide hidden lg:table-cell">Dirección</th>
              <th className="text-left text-slate-500 font-medium py-2 px-3 text-xs uppercase tracking-wide">Próx. fin bolsa</th>
              <th className="text-right text-slate-500 font-medium py-2 px-3 text-xs uppercase tracking-wide w-16"></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map(c => {
              // Mascota con fin de bolsa más próximo
              const mascotaUrgente = c.mascotas
                .filter(m => m.diasRestantes !== null)
                .sort((a, b) => (a.diasRestantes ?? 999) - (b.diasRestantes ?? 999))[0]
                ?? c.mascotas[0]

              return (
                <tr
                  key={c.clienteId}
                  className="border-b border-slate-900 hover:bg-slate-900 transition-colors group cursor-pointer"
                  onClick={() => router.push(`/dashboard/clientes/${c.clienteId}`)}
                >
                  {/* Cliente */}
                  <td className="py-3 px-3 text-white">
                    {c.clienteNombre}
                    {/* Mobile: mostrar mascotas debajo del nombre */}
                    <span className="block text-slate-500 text-xs sm:hidden mt-0.5">
                      {c.mascotas.map(m => `${m.especie === 'perro' ? '🐶' : '🐱'} ${m.mascotaNombre}`).join(' · ')}
                    </span>
                  </td>

                  {/* Mascotas */}
                  <td className="py-3 px-3 hidden sm:table-cell">
                    <div className="flex flex-col gap-1">
                      {c.mascotas.map(m => (
                        <span key={m.mascotaId} className="text-slate-300 flex items-center gap-1.5">
                          <span className={`px-1.5 py-0.5 rounded text-xs ${
                            m.especie === 'perro' ? 'bg-blue-950 text-blue-300' : 'bg-green-950 text-green-300'
                          }`}>
                            {m.especie === 'perro' ? '🐶' : '🐱'}
                          </span>
                          {m.mascotaNombre}
                          {m.mascotaPeso && <span className="text-slate-600 text-xs">({m.mascotaPeso}kg)</span>}
                          {m.producto && <span className="text-slate-500 text-xs hidden md:inline">— {m.producto}</span>}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Dirección */}
                  <td className="py-3 px-3 text-slate-400 hidden lg:table-cell">
                    {c.direccion ?? '—'}
                  </td>

                  {/* Fin de bolsa más urgente */}
                  <td className={`py-3 px-3 ${colorDias(mascotaUrgente?.diasRestantes ?? null)}`}>
                    {mascotaUrgente?.fechaFin ? (
                      <span>
                        {new Date(mascotaUrgente.fechaFin + 'T12:00:00').toLocaleDateString('es-UY')}
                        {c.mascotas.length > 1 && (
                          <span className="block text-slate-500 text-xs font-normal">
                            {mascotaUrgente.mascotaNombre}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-slate-600">Sin fecha</span>
                    )}
                  </td>

                  {/* Eliminar */}
                  <td className="py-3 px-3 text-right" onClick={e => e.stopPropagation()}>
                    <AlertDialog open={deletingId === c.clienteId} onOpenChange={(open) => !open && setDeletingId(null)}>
                      <AlertDialogTrigger
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeletingId(c.clienteId)
                        }}
                        className="p-2 rounded-md text-slate-500 hover:text-red-400 hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Se dará de baja a <strong>{c.clienteNombre}</strong> y todas sus ventas. Esta acción no se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setDeletingId(null)}>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(c.clienteId)}
                            disabled={isPending}
                            variant="destructive"
                          >
                            {isPending ? 'Eliminando...' : 'Sí, eliminar'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </td>
                </tr>
              )
            })}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-600">
                  No se encontraron clientes
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-slate-600 text-xs mt-2 text-right">
        {filtrados.length} clientes · ordenado por fin de bolsa
      </p>
    </div>
  )
}
