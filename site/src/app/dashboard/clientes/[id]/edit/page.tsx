import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { EditClienteForm } from './edit-form'

export default async function EditClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: clienteRaw } = await supabase
    .from('clientes')
    .select('*, perros(*)')
    .eq('id', id)
    .single()

  if (!clienteRaw) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cliente = clienteRaw as any

  async function guardarCliente(formData: FormData) {
    'use server'
    const supabase = await createClient()
    await supabase.from('clientes').update({
      nombre: formData.get('nombre') as string,
      telefono: (formData.get('telefono') as string) || null,
      direccion: (formData.get('direccion') as string) || null,
    }).eq('id', id)
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
