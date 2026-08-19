'use server'

import { sql } from '@/lib/db'
import { revalidatePath } from 'next/cache'

// Elimina un cliente por completo: sus ventas, sus mascotas y su ficha.
// NO se puede deshacer.
//
// Para sacar a alguien de la lista sin perder el historial está "Dar de baja"
// en la ficha del cliente, que sólo pone activo = false.
export async function eliminarClienteConVentas(
  clienteId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Devolver el stock de cada venta a su casa correcta
    await sql`SELECT devolver_stock_venta(id) FROM ventas WHERE cliente_id = ${clienteId}`
    await sql`DELETE FROM ventas WHERE cliente_id = ${clienteId}`
    await sql`DELETE FROM perros WHERE cliente_id = ${clienteId}`
    await sql`DELETE FROM clientes WHERE id = ${clienteId}`
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/caja')
    revalidatePath('/dashboard/stock')
    return { success: true }
  } catch {
    return { success: false, error: 'Error al eliminar el cliente' }
  }
}
