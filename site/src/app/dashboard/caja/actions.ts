'use server'

import { sql } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function marcarPagado(ventaId: string): Promise<void> {
  await sql`UPDATE ventas SET pagado = true WHERE id = ${ventaId}`
  revalidatePath('/dashboard/caja')
}
