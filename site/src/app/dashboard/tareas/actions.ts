'use server'

import { sql } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function toggleTarea(id: string, completada: boolean) {
  await sql`UPDATE tareas SET completada = ${completada} WHERE id = ${id}`
  revalidatePath('/dashboard/tareas')
}

export async function crearTarea(titulo: string) {
  await sql`INSERT INTO tareas (titulo) VALUES (${titulo})`
  revalidatePath('/dashboard/tareas')
}
