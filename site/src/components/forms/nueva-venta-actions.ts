'use server'

import { sql } from '@/lib/db'
import { appendVentaToSheet } from '@/lib/google-sheets'
import { buscarClienteSimilar, completarDatosContacto, type ClienteEncontrado } from '@/lib/clientes'
import { revalidatePath } from 'next/cache'

export interface BolsaVenta {
  producto:      string
  tamañoBolsaKg: number
  precio:        number   // por bolsa
  cantidad:      number
}

// Las bolsas de una misma mascota, con lo que come y cuándo se le termina.
export interface MascotaVenta {
  perroId:          string | null   // null = la mascota nueva de `mascotaNueva`
  gramosPorComida:  number | null
  vecesAlDia:       number | null
  intervaloDias:    number | null
  fechaEstimadaFin: string | null
  bolsas:           BolsaVenta[]
}

interface VentaInput {
  clienteId:        string | null   // elegido de la lista de clientes existentes
  clienteNombre:    string
  clienteTelefono:  string | null
  clienteDireccion: string | null
  mascotaNueva: {
    nombre:  string
    especie: 'perro' | 'gato'
    tipo:    string | null
    pesoKg:  number | null
  } | null
  mascotas: MascotaVenta[]
  casa:     'shangrila' | 'departamento'   // de qué casa sale el stock
  pagado:   boolean
}

function validar(d: VentaInput): string | null {
  if (!d.mascotas.length || d.mascotas.some(m => !m.bolsas.length)) return 'Agregá al menos una bolsa.'
  for (const b of d.mascotas.flatMap(m => m.bolsas)) {
    if (!b.producto.trim()) return 'Falta elegir el producto de una de las bolsas.'
    if (!Number.isInteger(b.cantidad) || b.cantidad < 1) return 'La cantidad de bolsas tiene que ser 1 o más.'
    if (!Number.isInteger(b.precio) || b.precio < 0) return `Revisá el precio de ${b.producto}.`
    if (!Number.isFinite(b.tamañoBolsaKg) || b.tamañoBolsaKg <= 0) return `Revisá los kilos de ${b.producto}.`
  }
  if (d.mascotas.some(m => !m.perroId) && !d.mascotaNueva?.nombre.trim()) return 'Falta el nombre de la mascota.'
  return null
}

export async function registrarVentaAction(
  d: VentaInput
): Promise<{ success: boolean; error?: string }> {
  // Se valida antes de escribir nada, para no dejar un cliente o mascota sueltos.
  const invalido = validar(d)
  if (invalido) return { success: false, error: invalido }
  const casa = d.casa === 'departamento' ? 'departamento' : 'shangrila'

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

    // 2. Mascotas. Las elegidas de la lista tienen que ser de este cliente.
    const mascotasCliente = await sql`SELECT id, nombre, especie, peso_kg FROM perros WHERE cliente_id = ${clienteId}`
    const delCliente = new Map(mascotasCliente.map(m => [m.id as string, m]))
    if (d.mascotas.some(m => m.perroId && !delCliente.has(m.perroId))) {
      return { success: false, error: 'Una de las mascotas elegidas no es de este cliente. Recargá la página.' }
    }

    // La mascota nueva: si el cliente ya tiene una con ese nombre se usa esa.
    let nuevaId: string | null = null
    const nueva = d.mascotaNueva
    if (nueva && d.mascotas.some(m => !m.perroId)) {
      const mismoNombre = mascotasCliente.find(m => (m.nombre as string).toLowerCase() === nueva.nombre.trim().toLowerCase())
      if (mismoNombre) {
        nuevaId = mismoNombre.id as string
      } else {
        const fila = await sql`
          INSERT INTO perros (cliente_id, nombre, especie, tipo, peso_kg)
          VALUES (${clienteId}, ${nueva.nombre.trim()}, ${nueva.especie}, ${nueva.especie === 'perro' ? nueva.tipo : null}, ${nueva.pesoKg})
          RETURNING id
        `
        nuevaId = fila[0].id as string
        delCliente.set(nuevaId, { id: nuevaId, nombre: nueva.nombre.trim(), especie: nueva.especie, peso_kg: nueva.pesoKg })
      }
    }

    const grupos = d.mascotas.map(m => {
      const perroId = (m.perroId ?? nuevaId) as string
      const ficha = delCliente.get(perroId)!
      return {
        ...m, perroId,
        nombre:  ficha.nombre as string,
        especie: ficha.especie as 'perro' | 'gato',
        pesoKg:  ficha.peso_kg != null ? Number(ficha.peso_kg) : undefined,
      }
    })

    for (const g of grupos) {
      if (g.especie === 'gato' && g.intervaloDias) {
        await sql`UPDATE perros SET intervalo_compra_dias = ${g.intervaloDias} WHERE id = ${g.perroId}`
      }
    }

    // 3. Registrar las bolsas con la misma función que el bot (guarda casa,
    // cantidad y pagado, y baja el stock de esa casa), todas en una sola
    // transacción: o se guardan todas o ninguna. Un producto escrito a mano que
    // no está en `productos` se guarda igual y no toca el stock.
    const filas = grupos.flatMap(g => g.bolsas.map(b => ({ g, b })))
    const resultados = await sql.transaction(filas.map(({ g, b }) => sql`SELECT registrar_venta(
      ${clienteId}::uuid, ${g.perroId}::uuid, ${b.producto.trim()},
      ${b.tamañoBolsaKg}, ${b.precio},
      ${g.especie === 'perro' ? g.gramosPorComida : null}, ${g.especie === 'perro' ? g.vecesAlDia : null},
      ${g.fechaEstimadaFin}::date, ${b.cantidad}, ${d.pagado},
      ${casa}
    ) AS venta_id`))

    // Todas las bolsas de una mascota llevan la misma fecha de fin, pero la
    // alerta tiene que llegar una sola vez: las demás se marcan como ya avisadas.
    const yaAvisadas: string[] = []
    const conAlerta = new Set<string>()
    filas.forEach(({ g }, i) => {
      if (!g.fechaEstimadaFin) return
      if (conAlerta.has(g.perroId)) yaAvisadas.push(resultados[i][0].venta_id as string)
      else conAlerta.add(g.perroId)
    })
    for (const ventaId of yaAvisadas) {
      await sql`UPDATE ventas SET alerta_enviada = true WHERE id = ${ventaId}`
    }

    // 4. Google Sheets (non-blocking): una fila por bolsa, como el bot.
    for (const { g, b } of filas) {
      try {
        await appendVentaToSheet({
          clienteNombre:    d.clienteNombre,
          clienteTelefono:  d.clienteTelefono ?? undefined,
          clienteDireccion: d.clienteDireccion ?? undefined,
          mascotaNombre:    g.nombre,
          especie:          g.especie,
          mascotaPeso:      g.pesoKg,
          producto:         b.producto.trim(),
          tamañoBolsaKg:    b.tamañoBolsaKg,
          precio:           b.precio,
          fechaVenta:       new Date().toISOString().split('T')[0],
          fechaEstimadaFin: g.fechaEstimadaFin ?? undefined,
        })
      } catch (e) {
        console.error('Sheets sync error (non-fatal):', e)
      }
    }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/caja')
    revalidatePath('/dashboard/stock')
    return { success: true }
  } catch (err) {
    console.error('registrarVentaAction error:', err)
    return { success: false, error: 'Error al guardar la venta.' }
  }
}
