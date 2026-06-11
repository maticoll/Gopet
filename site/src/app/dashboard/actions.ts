'use server'

import { sql } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function eliminarClienteConVentas(
  clienteId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await sql`DELETE FROM ventas WHERE cliente_id = ${clienteId}`
    await sql`DELETE FROM perros WHERE cliente_id = ${clienteId}`
    await sql`DELETE FROM clientes WHERE id = ${clienteId}`
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/caja')
    return { success: true }
  } catch {
    return { success: false, error: 'Error al dar de baja el cliente' }
  }
}
