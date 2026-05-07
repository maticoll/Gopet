'use server'

import { sql } from '@/lib/db'
import { appendVentaToSheet } from '@/lib/google-sheets'
import { revalidatePath } from 'next/cache'

interface VentaInput {
  clienteNombre:    string
  clienteTelefono:  string | null
  clienteDireccion: string | null
  mascotaNombre:    string
  mascotaPeso:      number | null
  especie:          'perro' | 'gato'
  tipoPerro:        string | null
  producto:         string
  tamañoBolsaKg:    number
  precio:           number
  gramosPorComida:  number | null
  vecesAlDia:       number | null
  intervaloDias:    number | null
  fechaEstimadaFin: string | null
}

export async function registrarVentaAction(
  d: VentaInput
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Buscar o crear cliente
    const clienteRows = await sql`SELECT id FROM clientes WHERE lower(nombre) = lower(${d.clienteNombre}) LIMIT 1`
    let clienteId: string

    if (clienteRows.length) {
      clienteId = clienteRows[0].id as string
      if (d.clienteTelefono)  await sql`UPDATE clientes SET telefono  = ${d.clienteTelefono}  WHERE id = ${clienteId}`
      if (d.clienteDireccion) await sql`UPDATE clientes SET direccion = ${d.clienteDireccion} WHERE id = ${clienteId}`
    } else {
      const nuevo = await sql`
        INSERT INTO clientes (nombre, telefono, direccion)
        VALUES (${d.clienteNombre}, ${d.clienteTelefono}, ${d.clienteDireccion})
        RETURNING id
      `
      clienteId = nuevo[0].id as string
    }

    // 2. Buscar o crear mascota
    const mascotaRows = await sql`
      SELECT id FROM perros
      WHERE cliente_id = ${clienteId} AND lower(nombre) = lower(${d.mascotaNombre})
      LIMIT 1
    `
    let perroId: string

    if (mascotaRows.length) {
      perroId = mascotaRows[0].id as string
      if (d.especie === 'gato' && d.intervaloDias) {
        await sql`UPDATE perros SET intervalo_compra_dias = ${d.intervaloDias}, peso_kg = ${d.mascotaPeso} WHERE id = ${perroId}`
      }
    } else {
      const nueva = await sql`
        INSERT INTO perros (cliente_id, nombre, especie, tipo, peso_kg)
        VALUES (${clienteId}, ${d.mascotaNombre}, ${d.especie}, ${d.tipoPerro}, ${d.mascotaPeso})
        RETURNING id
      `
      perroId = nueva[0].id as string
    }

    // 3. Registrar venta
    await sql`
      INSERT INTO ventas (cliente_id, perro_id, producto, tamaño_bolsa_kg, precio, gramos_por_comida, veces_al_dia, fecha_estimada_fin)
      VALUES (${clienteId}, ${perroId}, ${d.producto}, ${d.tamañoBolsaKg}, ${d.precio}, ${d.gramosPorComida}, ${d.vecesAlDia}, ${d.fechaEstimadaFin}::date)
    `

    // 4. Google Sheets (non-blocking)
    try {
      await appendVentaToSheet({
        clienteNombre:    d.clienteNombre,
        clienteTelefono:  d.clienteTelefono ?? undefined,
        clienteDireccion: d.clienteDireccion ?? undefined,
        mascotaNombre:    d.mascotaNombre,
        especie:          d.especie,
        mascotaPeso:      d.mascotaPeso ?? undefined,
        producto:         d.producto,
        tamañoBolsaKg:    d.tamañoBolsaKg,
        precio:           d.precio,
        fechaVenta:       new Date().toISOString().split('T')[0],
        fechaEstimadaFin: d.fechaEstimadaFin ?? undefined,
      })
    } catch (e) {
      console.error('Sheets sync error (non-fatal):', e)
    }

    revalidatePath('/dashboard')
    return { success: true }
  } catch (err) {
    console.error('registrarVentaAction error:', err)
    return { success: false, error: 'Error al guardar la venta.' }
  }
}
