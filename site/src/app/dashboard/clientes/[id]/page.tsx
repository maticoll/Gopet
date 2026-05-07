import { sql } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { diasHastaFin } from '@/lib/calculations'
import { BajaButton } from './baja-button'

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
      return { ...mascota, ventas }
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

      <div className="bg-slate-900 rounded-lg p-4 mb-6 grid grid-cols-2 gap-3">
        <div>
          <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Teléfono</p>
          <p className="text-white">{(cliente.telefono as string) ?? '—'}</p>
        </div>
        <div>
          <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Dirección</p>
          <p className="text-white">{(cliente.direccion as string) ?? '—'}</p>
        </div>
      </div>

      {mascotasConVentas.map((mascota) => (
        <div key={mascota.id as string} className="bg-slate-900 rounded-lg p-4 mb-4">
          <h3 className="text-white font-semibold mb-3">
            {mascota.especie === 'perro' ? '🐶' : '🐱'} {mascota.nombre as string}
            <span className="text-slate-500 text-sm ml-2">
              ({mascota.peso_kg ? `${mascota.peso_kg}kg · ` : ''}{(mascota.tipo as string) ?? mascota.especie})
            </span>
          </h3>
          <div className="space-y-2">
            {mascota.ventas.map((venta) => {
              const dias = venta.fecha_estimada_fin
                ? diasHastaFin(new Date(venta.fecha_estimada_fin as string))
                : null
              return (
                <div key={venta.id as string} className="bg-slate-800 rounded p-3 flex justify-between items-center">
                  <div>
                    <p className="text-white text-sm">{venta.producto as string}</p>
                    <p className="text-slate-400 text-xs">
                      {new Date(venta.fecha_venta as string).toLocaleDateString('es-UY')} · ${(venta.precio as number)?.toLocaleString('es-UY')}
                    </p>
                  </div>
                  {venta.fecha_estimada_fin && (
                    <span className={`text-xs font-semibold ${
                      dias !== null && dias <= 3 ? 'text-red-400' :
                      dias !== null && dias <= 7 ? 'text-orange-400' :
                      'text-green-400'
                    }`}>
                      {dias !== null
                        ? dias >= 0
                          ? `${dias}d restantes`
                          : `Venció hace ${Math.abs(dias)}d`
                        : ''}
                    </span>
                  )}
                </div>
              )
            })}
            {mascota.ventas.length === 0 && (
              <p className="text-slate-600 text-sm">Sin ventas registradas</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
