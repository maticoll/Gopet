'use server'

import { sql } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function editarMascota(
  mascotaId: string,
  clienteId: string,
  data: {
    nombre: string
    especie: string
    tipo: string | null
    peso_kg: number | null
  }
): Promise<void> {
  await sql`
    UPDATE perros SET
      nombre   = ${data.nombre},
      especie  = ${data.especie},
      tipo     = ${data.tipo},
      peso_kg  = ${data.peso_kg}
    WHERE id = ${mascotaId}
  `
  revalidatePath(`/dashboard/clientes/${clienteId}`)
}

export async function eliminarMascota(
  mascotaId: string,
  clienteId: string
): Promise<void> {
  // Eliminar ventas asociadas primero (FK)
  await sql`DELETE FROM ventas WHERE perro_id = ${mascotaId}`
  await sql`DELETE FROM perros WHERE id = ${mascotaId}`
  revalidatePath(`/dashboard/clientes/${clienteId}`)
}

export async function editarFechaFinBolsa(
  ventaId: string,
  clienteId: string,
  fecha: string | null
): Promise<void> {
  await sql`
    UPDATE ventas SET fecha_estimada_fin = ${fecha}
    WHERE id = ${ventaId}
  `
  revalidatePath(`/dashboard/clientes/${clienteId}`)
}
