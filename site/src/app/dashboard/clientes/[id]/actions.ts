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
  // Devolver el stock de cada venta antes de borrar
  await sql`SELECT devolver_stock_venta(id) FROM ventas WHERE perro_id = ${mascotaId}`
  // Eliminar ventas asociadas primero (FK)
  await sql`DELETE FROM ventas WHERE perro_id = ${mascotaId}`
  await sql`DELETE FROM perros WHERE id = ${mascotaId}`
  revalidatePath(`/dashboard/clientes/${clienteId}`)
}

export async function editarVenta(
  ventaId: string,
  clienteId: string,
  data: {
    producto: string
    precio: number
    cantidad: number
    fecha_venta: string
    fecha_estimada_fin: string | null
  }
): Promise<void> {
  await sql`
    UPDATE ventas SET
      producto          = ${data.producto},
      precio            = ${data.precio},
      cantidad          = ${data.cantidad},
      fecha_venta       = ${data.fecha_venta}::date,
      fecha_estimada_fin = ${data.fecha_estimada_fin}::date
    WHERE id = ${ventaId}
  `
  revalidatePath(`/dashboard/clientes/${clienteId}`)
}

export async function eliminarVenta(
  ventaId: string,
  clienteId: string
): Promise<void> {
  // Devolver el stock a la casa correcta antes de borrar
  await sql`SELECT devolver_stock_venta(${ventaId}::uuid)`
  await sql`DELETE FROM ventas WHERE id = ${ventaId}`
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
