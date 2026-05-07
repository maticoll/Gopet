'use server'

import { sql } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function eliminarClienteConVentas(
  clienteId: string,
  ventaId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await sql`DELETE FROM ventas WHERE id = ${ventaId}`
    await sql`UPDATE clientes SET activo = false WHERE id = ${clienteId}`
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/caja')
    return { success: true }
  } catch {
    return { success: false, error: 'Error al dar de baja el cliente' }
  }
}
