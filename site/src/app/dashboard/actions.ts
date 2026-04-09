'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function eliminarClienteConVentas(
  clienteId: string,
  ventaId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Primero eliminamos la venta de caja
  const { error: errorVenta } = await supabase
    .from('ventas')
    .delete()
    .eq('id', ventaId)

  if (errorVenta) {
    return { success: false, error: 'Error al eliminar la venta' }
  }

  // Luego marcamos el cliente como inactivo (soft delete)
  // También podríamos hacer hard delete si preferís
  const { error: errorCliente } = await supabase
    .from('clientes')
    .update({ activo: false })
    .eq('id', clienteId)

  if (errorCliente) {
    return { success: false, error: 'Error al dar de baja el cliente' }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/caja')
  return { success: true }
}
