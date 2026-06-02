import { sql } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { EditClienteForm } from './edit-form'

export default async function EditClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const clientes = await sql`SELECT *, (SELECT json_agg(p) FROM perros p WHERE p.cliente_id = clientes.id) AS perros FROM clientes WHERE id = ${id}`
  if (!clientes.length) notFound()
  const cliente = clientes[0] as { id: string; nombre: string; telefono: string | null; direccion: string | null; data_extra: string | null }

  async function guardarCliente(formData: FormData) {
    'use server'
    await sql`
      UPDATE clientes SET
        nombre     = ${formData.get('nombre') as string},
        telefono   = ${(formData.get('telefono') as string) || null},
        direccion  = ${(formData.get('direccion') as string) || null},
        data_extra = ${(formData.get('data_extra') as string) || null}
      WHERE id = ${id}
    `
    redirect(`/dashboard/clientes/${id}`)
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/dashboard/clientes/${id}`} className="text-slate-400 hover:text-white text-sm transition-colors">
          ← Cancelar
        </Link>
        <h1 className="text-white text-2xl font-bold">Editar cliente</h1>
      </div>

      <EditClienteForm cliente={cliente} guardarCliente={guardarCliente} />
    </div>
  )
}
