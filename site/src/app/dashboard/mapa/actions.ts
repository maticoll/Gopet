'use server'

import { sql } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function guardarUbicacionCliente(
  clienteId: string,
  lat: number,
  lng: number
): Promise<void> {
  await sql`UPDATE clientes SET lat = ${lat}, lng = ${lng} WHERE id = ${clienteId}`
  revalidatePath('/dashboard/mapa')
}
