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

interface ClienteRow {
  ventaId: string
  clienteId: string
  clienteNombre: string
  mascotaNombre: string
  mascotaPeso: number | null
  especie: 'perro' | 'gato'
  producto: string
  direccion: string | null
  fechaFin: string | null
  diasRestantes: number | null
}

function colorFecha(dias: number | null) {
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

  const handleDelete = (clienteId: string, ventaId: string) => {
    startTransition(async () => {
      const result = await eliminarClienteConVentas(clienteId, ventaId)
      if (result.success) {
        setDeletingId(null)
        router.refresh()
      }
    })
  }

  const filtrados = clientes.filter(c => {
    const matchBusqueda =
      c.clienteNombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.mascotaNombre.toLowerCase().includes(busqueda.toLowerCase())
    const matchEspecie = filtroEspecie === 'todos' || c.especie === filtroEspecie
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
              <th className="text-left text-slate-500 font-medium py-2 px-3 text-xs uppercase tracking-wide hidden sm:table-cell">Mascota</th>
              <th className="text-left text-slate-500 font-medium py-2 px-3 text-xs uppercase tracking-wide hidden md:table-cell">Especie</th>
              <th className="text-left text-slate-500 font-medium py-2 px-3 text-xs uppercase tracking-wide hidden lg:table-cell">Alimento</th>
              <th className="text-left text-slate-500 font-medium py-2 px-3 text-xs uppercase tracking-wide hidden lg:table-cell">Dirección</th>
              <th className="text-left text-slate-500 font-medium py-2 px-3 text-xs uppercase tracking-wide">Fin bolsa</th>
              <th className="text-right text-slate-500 font-medium py-2 px-3 text-xs uppercase tracking-wide w-16"></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map(c => (
              <tr
                key={c.ventaId}
                className="border-b border-slate-900 hover:bg-slate-900 transition-colors group"
              >
                <td 
                  className="py-3 px-3 text-white cursor-pointer"
                  onClick={() => router.push(`/dashboard/clientes/${c.clienteId}`)}
                >
                  {c.clienteNombre}
                  <span className="block text-slate-500 text-xs sm:hidden">{c.mascotaNombre}</span>
                </td>
                <td 
                  className="py-3 px-3 text-white hidden sm:table-cell cursor-pointer"
                  onClick={() => router.push(`/dashboard/clientes/${c.clienteId}`)}
                >
                  {c.mascotaNombre}
                  {c.mascotaPeso !== null && <span className="text-slate-500 ml-1">({c.mascotaPeso}kg)</span>}
                </td>
                <td 
                  className="py-3 px-3 hidden md:table-cell cursor-pointer"
                  onClick={() => router.push(`/dashboard/clientes/${c.clienteId}`)}
                >
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    c.especie === 'perro'
                      ? 'bg-blue-950 text-blue-300'
                      : 'bg-green-950 text-green-300'
                  }`}>
                    {c.especie === 'perro' ? '🐶 Perro' : '🐱 Gato'}
                  </span>
                </td>
                <td 
                  className="py-3 px-3 text-white hidden lg:table-cell cursor-pointer"
                  onClick={() => router.push(`/dashboard/clientes/${c.clienteId}`)}
                >
                  {c.producto}
                </td>
                <td 
                  className="py-3 px-3 text-slate-400 hidden lg:table-cell cursor-pointer"
                  onClick={() => router.push(`/dashboard/clientes/${c.clienteId}`)}
                >
                  {c.direccion ?? '—'}
                </td>
                <td 
                  className={`py-3 px-3 ${colorFecha(c.diasRestantes)} cursor-pointer`}
                  onClick={() => router.push(`/dashboard/clientes/${c.clienteId}`)}
                >
                  {c.fechaFin
                    ? new Date(c.fechaFin).toLocaleDateString('es-UY')
                    : <span className="text-slate-600">Sin fecha</span>}
                </td>
                <td className="py-3 px-3 text-right">
                  <AlertDialog open={deletingId === c.ventaId} onOpenChange={(open) => !open && setDeletingId(null)}>
                    <AlertDialogTrigger
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeletingId(c.ventaId)
                      }}
                      className="p-2 rounded-md text-slate-500 hover:text-red-400 hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Se dará de baja a <strong>{c.clienteNombre}</strong> y se eliminará su última venta de la caja. Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeletingId(null)}>
                          Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(c.clienteId, c.ventaId)}
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
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-600">
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
