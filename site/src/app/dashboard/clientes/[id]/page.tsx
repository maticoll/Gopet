import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { diasHastaFin } from '@/lib/calculations'
import { BajaButton } from './baja-button'

export default async function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: clienteRaw } = await supabase
    .from('clientes')
    .select(`
      *,
      perros(
        *,
        ventas(*)
      )
    `)
    .eq('id', id)
    .single()

  if (!clienteRaw) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cliente = clienteRaw as any

  async function darDeBaja() {
    'use server'
    const supabase = await createClient()
    await supabase.from('clientes').update({ activo: false }).eq('id', id)
    redirect('/dashboard')
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard" className="text-slate-400 hover:text-white text-sm transition-colors">
          ← Volver
        </Link>
        <h1 className="text-white text-2xl font-bold flex-1">{cliente.nombre}</h1>
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
          <p className="text-white">{cliente.telefono ?? '—'}</p>
        </div>
        <div>
          <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Dirección</p>
          <p className="text-white">{cliente.direccion ?? '—'}</p>
        </div>
      </div>

      {cliente.perros?.map((mascota: any) => (
        <div key={mascota.id} className="bg-slate-900 rounded-lg p-4 mb-4">
          <h3 className="text-white font-semibold mb-3">
            {mascota.especie === 'perro' ? '🐶' : '🐱'} {mascota.nombre}
            <span className="text-slate-500 text-sm ml-2">
              ({mascota.peso_kg ? `${mascota.peso_kg}kg · ` : ''}{mascota.tipo ?? mascota.especie})
            </span>
          </h3>
          <div className="space-y-2">
            {mascota.ventas?.map((venta: any) => {
              const dias = venta.fecha_estimada_fin
                ? diasHastaFin(new Date(venta.fecha_estimada_fin))
                : null
              return (
                <div key={venta.id} className="bg-slate-800 rounded p-3 flex justify-between items-center">
                  <div>
                    <p className="text-white text-sm">{venta.producto}</p>
                    <p className="text-slate-400 text-xs">
                      {new Date(venta.fecha_venta).toLocaleDateString('es-UY')} · ${venta.precio?.toLocaleString('es-UY')}
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
            {(!mascota.ventas || mascota.ventas.length === 0) && (
              <p className="text-slate-600 text-sm">Sin ventas registradas</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
