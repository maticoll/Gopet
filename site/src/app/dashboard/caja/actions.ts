'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function marcarPagado(ventaId: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('ventas')
    .update({ pagado: true })
    .eq('id', ventaId)
  revalidatePath('/dashboard/caja')
}
