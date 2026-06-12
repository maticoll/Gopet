'use server'

import { sql } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function eliminarClienteConVentas(
  clienteId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Devolver el stock de cada venta del cliente a su casa correcta
    await sql`SELECT devolver_stock_venta(id) FROM ventas WHERE cliente_id = ${clienteId}`
    await sql`DELETE FROM ventas WHERE cliente_id = ${clienteId}`
    await sql`DELETE FROM perros WHERE cliente_id = ${clienteId}`
    await sql`DELETE FROM clientes WHERE id = ${clienteId}`
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/caja')
    revalidatePath('/dashboard/stock')
    return { success: true }
  } catch {
    return { success: false, error: 'Error al dar de baja el cliente' }
  }
}
