'use server'

import { sql } from '@/lib/db'
import { appendVentaToSheet } from '@/lib/google-sheets'
import { buscarClienteSimilar, completarDatosContacto, type ClienteEncontrado } from '@/lib/clientes'
import { revalidatePath } from 'next/cache'

interface VentaInput {
  clienteId:        string | null   // elegido de la lista de clientes existentes
  clienteNombre:    string
  clienteTelefono:  string | null
  clienteDireccion: string | null
  perroId:          string | null   // mascota existente elegida
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
    // 1. Buscar o crear cliente.
    // Si lo eligieron de la lista se usa esa ficha tal cual. Si lo escribieron a
    // mano, se busca con el mismo matcher que el bot (ignora acentos y typos):
    // antes "Nacho Merlí" con "Nacho Merli" en la base creaba una segunda ficha.
    let clienteExistente: ClienteEncontrado | null = null
    if (d.clienteId) {
      const rows = await sql`SELECT id, nombre, telefono, direccion, activo FROM clientes WHERE id = ${d.clienteId}`
      clienteExistente = (rows[0] as unknown as ClienteEncontrado) ?? null
    }
    if (!clienteExistente) clienteExistente = await buscarClienteSimilar(d.clienteNombre)
    let clienteId: string

    if (clienteExistente) {
      clienteId = clienteExistente.id
      // Igual que el bot: si estaba de baja y vuelve a comprar, vuelve a estar activo.
      if (!clienteExistente.activo) await sql`UPDATE clientes SET activo = true WHERE id = ${clienteId}`
      // Sólo completa lo que está vacío: no pisa un teléfono o dirección ya cargados.
      await completarDatosContacto(clienteExistente, d.clienteTelefono, d.clienteDireccion)
    } else {
      const nuevo = await sql`
        INSERT INTO clientes (nombre, telefono, direccion)
        VALUES (${d.clienteNombre}, ${d.clienteTelefono}, ${d.clienteDireccion})
        RETURNING id
      `
      clienteId = nuevo[0].id as string
    }

    // 2. Buscar o crear mascota (la elegida tiene que ser de este cliente)
    let perroId: string | null = null
    if (d.perroId) {
      const rows = await sql`SELECT id FROM perros WHERE id = ${d.perroId} AND cliente_id = ${clienteId}`
      perroId = (rows[0]?.id as string) ?? null
    }
    if (!perroId) {
      const mascotaRows = await sql`
        SELECT id FROM perros
        WHERE cliente_id = ${clienteId} AND lower(nombre) = lower(${d.mascotaNombre})
        ORDER BY created_at ASC
        LIMIT 1
      `
      perroId = (mascotaRows[0]?.id as string) ?? null
    }

    if (perroId) {
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
