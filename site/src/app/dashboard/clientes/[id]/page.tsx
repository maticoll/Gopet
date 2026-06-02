import { sql } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { BajaButton } from './baja-button'
import MascotaCard from './MascotaCard'

export default async function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const clientes = await sql`SELECT * FROM clientes WHERE id = ${id}`
  if (!clientes.length) notFound()
  const cliente = clientes[0]

  const mascotas = await sql`SELECT * FROM perros WHERE cliente_id = ${id}`
  const mascotasConVentas = await Promise.all(
    mascotas.map(async (mascota) => {
      const ventas = await sql`
        SELECT * FROM ventas WHERE perro_id = ${mascota.id as string}
        ORDER BY fecha_venta DESC
      `
      return { ...(mascota as Record<string, unknown>), ventas } as Record<string, unknown> & { ventas: Record<string, unknown>[] }
    })
  )

  async function darDeBaja() {
    'use server'
    await sql`UPDATE clientes SET activo = false WHERE id = ${id}`
    redirect('/dashboard')
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard" className="text-slate-400 hover:text-white text-sm transition-colors">
          ← Volver
        </Link>
        <h1 className="text-white text-2xl font-bold flex-1">{cliente.nombre as string}</h1>
        <Link
          href={`/dashboard/clientes/${id}/edit`}
          className="text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded border border-slate-700 transition-colors"
        >
          Editar
        </Link>
        <BajaButton darDeBaja={darDeBaja} />
      </div>

      <div className="bg-slate-900 rounded-lg p-4 mb-6 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Teléfono</p>
            <p className="text-white">{(cliente.telefono as string) ?? '—'}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Dirección</p>
            <p className="text-white">{(cliente.direccion as string) ?? '—'}</p>
          </div>
        </div>
        <div>
          <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Data extra</p>
          <p className="text-white whitespace-pre-wrap">{(cliente.data_extra as string) ?? '—'}</p>
        </div>
      </div>

      {mascotasConVentas.map((mascota) => (
        <MascotaCard
          key={mascota.id as string}
          clienteId={id}
          mascota={{
            id: mascota.id as string,
            nombre: mascota.nombre as string,
            especie: mascota.especie as string,
            tipo: mascota.tipo as string | null,
            peso_kg: mascota.peso_kg as number | null,
            ventas: (mascota.ventas as Record<string, unknown>[]).map(v => ({
              id: v.id as string,
              producto: v.producto as string,
              precio: v.precio as number,
              fecha_venta: v.fecha_venta as string,
              fecha_estimada_fin: v.fecha_estimada_fin as string | null,
            })),
          }}
        />
      ))}
    </div>
  )
}
