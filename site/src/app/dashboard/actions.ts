'use server'

import { sql } from '@/lib/db'
import { revalidatePath } from 'next/cache'

// Da de baja un cliente: deja de aparecer en el dashboard y de recibir alertas,
// pero NO se borra nada.
//
// Antes esta acción hacía DELETE de las ventas, las mascotas y el cliente. El
// cartel decía "se dará de baja", así que se perdía historial (y facturación
// del total) creyendo que era una baja reversible. Ahora es reversible de
// verdad: alcanza con volver a poner activo = true, y cualquier venta nueva
// del cliente lo reactiva sola.
export async function darDeBajaCliente(
  clienteId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await sql`UPDATE clientes SET activo = false WHERE id = ${clienteId}`
    revalidatePath('/dashboard')
    revalidatePath(`/dashboard/clientes/${clienteId}`)
    return { success: true }
  } catch {
    return { success: false, error: 'Error al dar de baja el cliente' }
  }
}

// Reactiva un cliente dado de baja.
export async function reactivarCliente(
  clienteId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await sql`UPDATE clientes SET activo = true WHERE id = ${clienteId}`
    revalidatePath('/dashboard')
    revalidatePath(`/dashboard/clientes/${clienteId}`)
    return { success: true }
  } catch {
    return { success: false, error: 'Error al reactivar el cliente' }
  }
}
