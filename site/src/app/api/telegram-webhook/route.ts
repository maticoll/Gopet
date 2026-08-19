import { NextRequest, NextResponse } from 'next/server'
import { parsearMensaje, type VentaData, type CompraStockData, type ActualizarClienteData, type EditarVentaData, type MovimientoCajaData, type TransferenciaInternaData, type DataExtraClienteData, type TareaData, type FaltanteProducto, type ParseResult } from '@/lib/claude-parser'
import { sendMessage, sendMessageWithButtons, answerCallbackQuery, deleteMessage, getFile, downloadFile, transcribeAudioWithClaude, getAuthorizedChatIds } from '@/lib/telegram'
import { appendVentaToSheet } from '@/lib/google-sheets'
import { sql } from '@/lib/db'
import { calcularFechaFinPerro, calcularFechaFinGato, calcularFechaFinPorGramosDia, fechaHoyUruguay, fechaHoyUruguayISO } from '@/lib/calculations'
import { repartirPrecioPromo, totalVentas } from '@/lib/promos'
import { buscarClienteSimilar, completarDatosContacto, contarFichasDelMismoNombre, type ClienteEncontrado } from '@/lib/clientes'

// ── Types ──────────────────────────────────────────────────────────────────
interface ProductoEncontrado {
  id: string
  nombre: string
  marca: string
  precio_venta: number
  stock_actual: number
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function obtenerGramosDiariosDeTabla(
  tipoPerro: string | null,
  pesoKg: number | null
): Promise<number | null> {
  if (!tipoPerro || !pesoKg) return null

  const tipoNormalizado = tipoPerro.toLowerCase()
    .replace('razas pequeñas', 'raza_pequeña')
    .replace('raza pequeña', 'raza_pequeña')
    .replace(/\s+/g, '_')

  // ORDER BY fijo: tabla_gramos tiene varias filas para el mismo tipo y rango
  // de peso. Sin orden, Postgres devolvía cualquiera y el mismo perro daba un
  // consumo distinto en cada venta.
  const rows = await sql`
    SELECT gramos_min, gramos_max FROM tabla_gramos
    WHERE tipo_perro = ${tipoNormalizado}
      AND peso_min_kg <= ${pesoKg}
      AND peso_max_kg >= ${pesoKg}
    ORDER BY peso_min_kg ASC, gramos_min ASC, gramos_max ASC
    LIMIT 1
  `
  if (rows.length) return promedioGramos(rows[0])

  // Peso fuera de las bandas cargadas (ej. un "raza pequeña" de 18 kg, que la
  // tabla sólo cubre hasta 10 kg). Antes eso devolvía null y la venta quedaba
  // sin fecha de fin de bolsa, o sea sin alerta nunca. Mejor estimar con la
  // banda más cercana del mismo tipo: la fecha se puede corregir a mano.
  const cercanas = await sql`
    SELECT gramos_min, gramos_max FROM tabla_gramos
    WHERE tipo_perro = ${tipoNormalizado}
    ORDER BY LEAST(abs(peso_min_kg - ${pesoKg}::numeric), abs(peso_max_kg - ${pesoKg}::numeric)) ASC,
             peso_min_kg ASC, gramos_min ASC
    LIMIT 1
  `
  return cercanas.length ? promedioGramos(cercanas[0]) : null
}

function promedioGramos(row: Record<string, unknown>): number {
  return Math.round((Number(row.gramos_min) + Number(row.gramos_max)) / 2)
}

async function buscarProductoEnBD(
  nombreProducto: string
): Promise<{ encontrados: ProductoEncontrado[], exacto: boolean }> {
  const exactoRows = await sql`
    SELECT id, nombre, marca, precio_venta, stock_actual
    FROM productos WHERE lower(nombre) = lower(${nombreProducto})
  `
  if (exactoRows.length === 1) {
    return { encontrados: exactoRows as unknown as ProductoEncontrado[], exacto: true }
  }

  const marcas = ['lager', 'maxine', 'connie', 'wits', 'toky']
  const tipos  = ['adulto', 'senior', 'cachorro', 'razas pequeñas', 'gato adulto', 'gato castrado']

  let queryMarca: string | null = null
  let queryTipo:  string | null = null
  let tamañoKg:   number | null = null

  const matchTamaño = nombreProducto.match(/(\d+(?:\+\d+)?)\s*kg/i)
  if (matchTamaño) tamañoKg = parseInt(matchTamaño[1].split('+')[0], 10)
  for (const m of marcas) if (nombreProducto.toLowerCase().includes(m)) { queryMarca = m; break }
  for (const t of tipos)  if (nombreProducto.toLowerCase().includes(t)) { queryTipo  = t; break }

  let parciales: ProductoEncontrado[] = []
  if (queryMarca && queryTipo) {
    const r = await sql`SELECT id, nombre, marca, precio_venta, stock_actual FROM productos WHERE lower(marca) LIKE lower(${'%' + queryMarca + '%'}) AND lower(nombre) LIKE lower(${'%' + queryTipo + '%'}) LIMIT 20`
    parciales = r as unknown as ProductoEncontrado[]
  } else if (queryMarca) {
    const r = await sql`SELECT id, nombre, marca, precio_venta, stock_actual FROM productos WHERE lower(marca) LIKE lower(${'%' + queryMarca + '%'}) LIMIT 20`
    parciales = r as unknown as ProductoEncontrado[]
  } else if (queryTipo) {
    const r = await sql`SELECT id, nombre, marca, precio_venta, stock_actual FROM productos WHERE lower(nombre) LIKE lower(${'%' + queryTipo + '%'}) LIMIT 20`
    parciales = r as unknown as ProductoEncontrado[]
  }

  let filtrados = parciales
  if (tamañoKg && filtrados.length > 0) {
    filtrados = filtrados.filter(p => {
      const m = p.nombre.match(/(\d+(?:\+\d+)?)\s*kg/i)
      if (!m) return false
      return parseInt(m[1].split('+')[0], 10) === tamañoKg
    })
  }
  return { encontrados: filtrados, exacto: filtrados.length === 1 }
}

async function buscarProductosPorCriterios(
  marca: string | null,
  tipoProducto: string | null,
  tamañoKg: number | null
): Promise<ProductoEncontrado[]> {
  let rows: ProductoEncontrado[] = []
  if (marca && tipoProducto) {
    const r = await sql`SELECT id, nombre, marca, precio_venta, stock_actual FROM productos WHERE lower(marca) LIKE lower(${'%' + marca + '%'}) AND lower(nombre) LIKE lower(${'%' + tipoProducto + '%'}) ORDER BY marca, nombre LIMIT 50`
    rows = r as unknown as ProductoEncontrado[]
  } else if (marca) {
    const r = await sql`SELECT id, nombre, marca, precio_venta, stock_actual FROM productos WHERE lower(marca) LIKE lower(${'%' + marca + '%'}) ORDER BY marca, nombre LIMIT 50`
    rows = r as unknown as ProductoEncontrado[]
  } else if (tipoProducto) {
    const r = await sql`SELECT id, nombre, marca, precio_venta, stock_actual FROM productos WHERE lower(nombre) LIKE lower(${'%' + tipoProducto + '%'}) ORDER BY marca, nombre LIMIT 50`
    rows = r as unknown as ProductoEncontrado[]
  }

  if (tamañoKg && rows.length > 0) {
    rows = rows.filter(p => {
      const m = p.nombre.match(/(\d+(?:\+\d+)?)\s*kg/i)
      if (!m) return false
      return parseInt(m[1].split('+')[0], 10) === tamañoKg
    })
  }
  return rows
}

function obtenerSiguienteCampoFaltante(d: VentaData, campoActual: string | null): string | null {
  const campos = ['telefono', 'direccion']
  const startIndex = campoActual ? campos.indexOf(campoActual) + 1 : 0
  for (let i = startIndex; i < campos.length; i++) {
    if (campos[i] === 'telefono' && !d.clienteTelefono) return 'telefono'
    if (campos[i] === 'direccion' && !d.clienteDireccion) return 'direccion'
  }
  return null
}

// ── POST handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ ok: true }) }

  const authorizedIds = getAuthorizedChatIds()

  // ── Callback (button press) ────────────────────────────────────────────
  const callbackQuery = (body as any)?.callback_query
  if (callbackQuery) {
    const callbackQueryId = String(callbackQuery.id)
    const chatId          = String(callbackQuery.message?.chat?.id)
    const messageId       = callbackQuery.message?.message_id as number | undefined

    if (authorizedIds.length > 0 && !authorizedIds.includes(chatId)) {
      return NextResponse.json({ ok: true })
    }

    const data    = String(callbackQuery.data ?? '')
    // El 2º segmento es el token de la confirmación pendiente, o el id de
    // la venta en los botones de alerta (recompro / esperar / baja).
    const [accion, argumento] = data.split(':')
    const token   = argumento || undefined
    const ventaId = argumento

    await answerCallbackQuery(callbackQueryId)

    // ── confirmar_venta ──────────────────────────────────────────────
    if (accion === 'confirmar_venta') {
      const pendiente = await leerEstadoPendiente(chatId, 'confirmando_venta', token)
      if (!pendiente.ok) {
        await sendMessage(chatId, pendiente.mensaje)
        return NextResponse.json({ ok: true })
      }
      if (messageId) await deleteMessage(chatId, messageId)
      const p = pendiente.payload

      // Recién acá se dan de alta el cliente y la mascota. Si el usuario
      // hubiera cancelado, no habría quedado nada escrito.
      const { clienteId, perroId, nombre, telefono, direccion, avisos } = await resolverClienteYMascota({
        clienteId: p.clienteId ?? null,
        clienteNombre: p.clienteNombre,
        clienteTelefono: p.clienteTelefono ?? null,
        clienteDireccion: p.clienteDireccion ?? null,
        perroId: p.perroId ?? null,
        mascotaNombre: p.mascotaNombre ?? null,
        especie: p.especie,
        tipoPerro: p.tipoPerro ?? null,
        pesoKg: p.pesoKg ?? null,
      })
      p.clienteId        = clienteId
      p.perroId          = perroId
      p.clienteNombre    = nombre
      p.clienteTelefono  = telefono
      p.clienteDireccion = direccion

      const ventaRows = await sql`SELECT registrar_venta(
        ${clienteId}::uuid, ${perroId}::uuid, ${p.producto},
        ${p.tamañoBolsaKg}, ${p.precio},
        ${p.gramosPorComida ?? null}, ${p.vecesAlDia ?? null},
        ${p.fechaFin ?? null}::date, ${p.cantidad}, ${p.pagado},
        ${p.casa ?? 'shangrila'}
      ) AS venta_id`

      await sql`DELETE FROM telegram_estados WHERE chat_id = ${chatId}`

      if (!ventaRows.length) {
        await sendMessage(chatId, '❌ Error al registrar la venta. Revisá los logs.')
        return NextResponse.json({ ok: true })
      }

      if (p.metodoPago) {
        await sql`UPDATE ventas SET metodo_pago = ${p.metodoPago} WHERE id = ${ventaRows[0].venta_id as string}`
      }

      // Si el usuario indicó la fecha de la venta, usarla (registrar_venta usa hoy por defecto)
      if (p.fechaVenta) {
        await sql`UPDATE ventas SET fecha_venta = ${p.fechaVenta}::date WHERE id = ${ventaRows[0].venta_id as string}`
      }

      if (p.dataExtraInline) {
        await sql`
          UPDATE clientes SET data_extra = CASE
            WHEN data_extra IS NULL OR data_extra = '' THEN ${p.dataExtraInline}
            ELSE data_extra || E'\n' || ${p.dataExtraInline}
          END
          WHERE id = ${p.clienteId}
        `
      }

      try {
        await appendVentaToSheet({
          clienteNombre: p.clienteNombre, clienteTelefono: p.clienteTelefono,
          clienteDireccion: p.clienteDireccion, mascotaNombre: p.mascotaNombre,
          especie: p.especie, mascotaPeso: p.pesoKg, producto: p.producto,
          tamañoBolsaKg: p.tamañoBolsaKg, precio: p.precio,
          fechaVenta: p.fechaVenta ?? fechaHoyUruguayISO(), fechaEstimadaFin: p.fechaFin,
        })
      } catch (e) { console.error('Sheets sync error (non-fatal):', e) }

      const stockRows = await sql`SELECT stock_actual FROM productos WHERE lower(nombre) = lower(${p.producto}) LIMIT 1`
      if (stockRows.length && (stockRows[0].stock_actual as number) <= 0) {
        for (const id of getAuthorizedChatIds()) {
          await sendMessage(id, `⚠️ Stock de <b>${p.producto}</b> llegó a 0.`)
        }
      }

      const avisosTexto = avisos.length ? `\n${avisos.join('\n')}` : ''
      const respuesta = p.fechaFin
        ? `✅ Venta registrada para <b>${p.clienteNombre}</b>${avisosTexto}\n📅 Fin de bolsa estimado: ${new Date(p.fechaFin + 'T12:00:00').toLocaleDateString('es-UY')}\n⚠️ Alerta programada para 7 días antes`
        : `✅ Venta registrada para <b>${p.clienteNombre}</b>${avisosTexto}\n(Sin fecha estimada — cargá raza y peso de la mascota para que calcule)`
      await sendMessage(chatId, respuesta)

      if (p.fechaFin && p.especie === 'perro' && p.gramosDiarios) {
        const dias = Math.round((p.tamañoBolsaKg * 1000) / p.gramosDiarios)
        await sendMessage(chatId, `📊 <b>Cálculo:</b>\n• Bolsa: ${p.tamañoBolsaKg} kg (${p.tamañoBolsaKg * 1000}g)\n• Consumo: ${p.gramosDiarios}g/día${p.pesoKg ? ` (según peso ${p.pesoKg}kg)` : ''}\n• Duración: ${dias} días`)
      } else if (p.fechaFin && p.especie === 'gato') {
        const hoyDate = fechaHoyUruguay()
        const dias = Math.round((new Date(p.fechaFin).getTime() - hoyDate.getTime()) / (1000 * 60 * 60 * 24))
        await sendMessage(chatId, `📊 <b>Cálculo:</b>\n• Intervalo de compra: ${dias} días (basado en historial)`)
      }

    // ── confirmar_ventas_multiples ───────────────────────────────────
    } else if (accion === 'confirmar_ventas_multiples') {
      const pendiente = await leerEstadoPendiente(chatId, 'confirmando_ventas_multiples', token)
      if (!pendiente.ok) {
        await sendMessage(chatId, pendiente.mensaje)
        return NextResponse.json({ ok: true })
      }
      if (messageId) await deleteMessage(chatId, messageId)
      const p = pendiente.payload
      await sql`DELETE FROM telegram_estados WHERE chat_id = ${chatId}`

      let registradas = 0
      let totalRegistrado = 0
      const avisosCliente: string[] = []
      let clienteIdCache: string | null = null
      let perroIdCache: string | null = null
      for (const v of p.ventasMultiples as VentaData[]) {
        // Todas las ventas del combo son del mismo cliente y la misma mascota:
        // se resuelven una sola vez y se reusan (antes cada vuelta volvía a
        // buscar y podía caer en una ficha distinta).
        if (!clienteIdCache || !perroIdCache) {
          const r = await resolverClienteYMascota({
            clienteId: null,
            clienteNombre: v.clienteNombre,
            clienteTelefono: v.clienteTelefono ?? null,
            clienteDireccion: v.clienteDireccion ?? null,
            perroId: null,
            mascotaNombre: v.mascotaNombre ?? null,
            especie: v.especie,
            tipoPerro: v.tipoPerro ?? null,
            pesoKg: v.pesoKg ?? null,
          })
          clienteIdCache = r.clienteId
          perroIdCache   = r.perroId
          avisosCliente.push(...r.avisos)
          v.clienteNombre = r.nombre
        }
        const clienteId = clienteIdCache
        const perroId   = perroIdCache
        // Calcular fecha fin (desde la fecha de venta indicada, o desde hoy)
        const baseVenta = v.fechaVenta ? new Date(v.fechaVenta + 'T12:00:00') : fechaHoyUruguay()
        let fechaFin: string | null = null
        if (v.especie === 'perro') {
          // Respaldo con lo que ya está guardado en la ficha de la mascota
          const mascotaRows = await sql`SELECT tipo, peso_kg FROM perros WHERE id = ${perroId}`
          const tipoEfectivo = v.tipoPerro ?? (mascotaRows[0]?.tipo as string | null) ?? null
          const pesoEfectivo = v.pesoKg ?? (mascotaRows[0]?.peso_kg != null ? Number(mascotaRows[0].peso_kg) : null)
          const g = await obtenerGramosDiariosDeTabla(tipoEfectivo, pesoEfectivo)
          if (g) fechaFin = calcularFechaFinPorGramosDia(baseVenta, v.tamañoBolsaKg, g).toISOString().split('T')[0]
        }
        if (v.precio === null || v.precio === undefined) {
          await sendMessage(chatId, `⚠️ No encontré el precio de "<b>${v.producto}</b>". Esa venta no se registró — registrala por separado con el precio.`)
          continue
        }
        const ventaRows = await sql`SELECT registrar_venta(${clienteId}::uuid, ${perroId}::uuid, ${v.producto}, ${v.tamañoBolsaKg}, ${v.precio}, ${null}, ${null}, ${fechaFin}::date, ${v.cantidad ?? 1}, ${v.pagado}, ${v.casa ?? 'shangrila'}) AS venta_id`
        const nuevaVentaId = ventaRows[0]?.venta_id as string | undefined
        if (nuevaVentaId && (v.metodoPago || v.fechaVenta)) {
          await sql`UPDATE ventas SET
            metodo_pago = COALESCE(${v.metodoPago ?? null}, metodo_pago),
            fecha_venta = COALESCE(${v.fechaVenta ?? null}::date, fecha_venta)
            WHERE id = ${nuevaVentaId}`
        }
        if (p.dataExtraInline && registradas === 0) {
          await sql`UPDATE clientes SET data_extra = CASE WHEN data_extra IS NULL OR data_extra = '' THEN ${p.dataExtraInline} ELSE data_extra || E'\n' || ${p.dataExtraInline} END WHERE id = ${clienteId}`
        }
        registradas++
        totalRegistrado += (v.precio ?? 0) * (v.cantidad ?? 1)
      }
      const nombreCliente = (p.ventasMultiples as VentaData[])[0].clienteNombre
      const avisosTexto = avisosCliente.length ? `\n${avisosCliente.join('\n')}` : ''
      await sendMessage(chatId, p.esPromo === true
        ? `✅ Promo registrada para <b>${nombreCliente}</b>${avisosTexto}\n📦 ${registradas} bolsas descontadas de stock\n💰 Total: $${totalRegistrado}`
        : `✅ ${registradas} ventas registradas para <b>${nombreCliente}</b>${avisosTexto}\n💰 Total: $${totalRegistrado}`)

    // ── cancelar_venta ───────────────────────────────────────────────
    } else if (accion === 'cancelar_venta') {
      const borrado = await borrarEstadoSiCorresponde(chatId, ['confirmando_venta', 'confirmando_ventas_multiples'], token)
      if (messageId) await deleteMessage(chatId, messageId)
      // Nada que deshacer: el cliente, la mascota y la venta se crean recién al confirmar.
      await sendMessage(chatId, borrado
        ? '❌ Venta cancelada. No se guardó nada.'
        : '❌ Ese botón ya no estaba vigente. No se guardó nada por acá.')

    // ── confirmar_compra_stock ───────────────────────────────────────
    } else if (accion === 'confirmar_compra_stock') {
      const pendiente = await leerEstadoPendiente(chatId, 'confirmando_compra_stock', token)
      if (!pendiente.ok) {
        await sendMessage(chatId, pendiente.mensaje)
        return NextResponse.json({ ok: true })
      }
      if (messageId) await deleteMessage(chatId, messageId)
      const p = pendiente.payload
      await sql`DELETE FROM telegram_estados WHERE chat_id = ${chatId}`

      const res = await aplicarCompraStock(p)
      await sendMessage(chatId, res.ok ? `✅ Stock actualizado.\n${res.resumen}` : res.resumen)

    // ── confirmar_compras_stock_multiples ────────────────────────────
    } else if (accion === 'confirmar_compras_stock_multiples') {
      const pendiente = await leerEstadoPendiente(chatId, 'confirmando_compras_stock_multiples', token)
      if (!pendiente.ok) {
        await sendMessage(chatId, pendiente.mensaje)
        return NextResponse.json({ ok: true })
      }
      if (messageId) await deleteMessage(chatId, messageId)
      const p = pendiente.payload
      await sql`DELETE FROM telegram_estados WHERE chat_id = ${chatId}`

      const compras = (p.compras as any[]) ?? []
      const lineas: string[] = []
      for (const c of compras) {
        const res = await aplicarCompraStock(c)
        lineas.push(res.resumen)
      }
      await sendMessage(chatId, `✅ Stock actualizado (${compras.length} productos).\n\n${lineas.join('\n')}`)

    // ── cancelar_compra_stock ────────────────────────────────────────
    } else if (accion === 'cancelar_compra_stock') {
      const borrado = await borrarEstadoSiCorresponde(chatId, ['confirmando_compra_stock', 'confirmando_compras_stock_multiples'], token)
      if (messageId) await deleteMessage(chatId, messageId)
      await sendMessage(chatId, borrado
        ? '❌ Compra cancelada. No se tocó el stock.'
        : '❌ Ese botón ya no estaba vigente. No se tocó el stock por acá.')

    // ── confirmar_movimiento_caja ────────────────────────────────────
    } else if (accion === 'confirmar_movimiento_caja') {
      const pendiente = await leerEstadoPendiente(chatId, 'confirmando_movimiento_caja', token)
      if (!pendiente.ok) {
        await sendMessage(chatId, pendiente.mensaje)
        return NextResponse.json({ ok: true })
      }
      if (messageId) await deleteMessage(chatId, messageId)
      const d = pendiente.payload as MovimientoCajaData
      await sql`DELETE FROM telegram_estados WHERE chat_id = ${chatId}`

      const fechaMov = d.fecha ?? fechaHoyUruguay().toISOString().split('T')[0]
      await sql`
        INSERT INTO movimientos_caja (descripcion, monto, categoria, metodo_pago, etiqueta, fecha, pagado)
        VALUES (${d.descripcion}, ${d.monto}, ${d.categoria}, ${d.metodoPago ?? null}, ${d.etiqueta ?? null}, ${fechaMov}::date, ${d.pagado ?? true})
      `
      await sendMessage(chatId, `✅ <b>Movimiento registrado</b>\n${bloqueMovimientoTexto(d)}`)

    // ── cancelar_movimiento_caja ─────────────────────────────────────
    } else if (accion === 'cancelar_movimiento_caja') {
      const borrado = await borrarEstadoSiCorresponde(chatId, ['confirmando_movimiento_caja'], token)
      if (messageId) await deleteMessage(chatId, messageId)
      await sendMessage(chatId, borrado
        ? '❌ Movimiento rechazado. No se registró nada.'
        : '❌ Ese botón ya no estaba vigente. No se registró nada por acá.')

    // ── confirmar_transferencia_interna ──────────────────────────────
    } else if (accion === 'confirmar_transferencia_interna') {
      const pendiente = await leerEstadoPendiente(chatId, 'confirmando_transferencia_interna', token)
      if (!pendiente.ok) {
        await sendMessage(chatId, pendiente.mensaje)
        return NextResponse.json({ ok: true })
      }
      if (messageId) await deleteMessage(chatId, messageId)
      const d = pendiente.payload as TransferenciaInternaData
      await sql`DELETE FROM telegram_estados WHERE chat_id = ${chatId}`

      await sql`
        INSERT INTO movimientos_caja (descripcion, monto, categoria, metodo_pago)
        VALUES (${'Transferencia interna'}, ${d.monto}, ${'egreso'}, ${d.de})
      `
      await sql`
        INSERT INTO movimientos_caja (descripcion, monto, categoria, metodo_pago)
        VALUES (${'Transferencia interna'}, ${d.monto}, ${'ingreso'}, ${d.a})
      `
      await sendMessage(chatId, `✅ <b>Registrada</b>\n${bloqueTransferenciaTexto(d)}`)

    // ── cancelar_transferencia_interna ───────────────────────────────
    } else if (accion === 'cancelar_transferencia_interna') {
      const borrado = await borrarEstadoSiCorresponde(chatId, ['confirmando_transferencia_interna'], token)
      if (messageId) await deleteMessage(chatId, messageId)
      await sendMessage(chatId, borrado
        ? '❌ Transferencia rechazada. No se registró nada.'
        : '❌ Ese botón ya no estaba vigente. No se registró nada por acá.')

    // ── recompro ─────────────────────────────────────────────────────
    } else if (accion === 'recompro') {
      const ventaRows = await sql`SELECT * FROM ventas WHERE id = ${ventaId}`
      if (!ventaRows.length) {
        await sendMessage(chatId, '⚠️ No encontré la venta original.')
        return NextResponse.json({ ok: true })
      }
      const v0 = ventaRows[0]
      const mascotaRows = await sql`SELECT tipo, peso_kg, intervalo_compra_dias, especie FROM perros WHERE id = ${v0.perro_id as string}`
      const mascota = mascotaRows[0]

      let nuevaFechaFin: string | null = null
      if (mascota?.especie === 'perro' || (!mascota?.especie && !mascota?.intervalo_compra_dias)) {
        const g = await obtenerGramosDiariosDeTabla(mascota?.tipo as string ?? null, mascota?.peso_kg as number ?? null)
        if (g) {
          nuevaFechaFin = calcularFechaFinPorGramosDia(fechaHoyUruguay(), v0.tamaño_bolsa_kg as number, g).toISOString().split('T')[0]
        } else if (v0.gramos_por_comida && v0.veces_al_dia) {
          nuevaFechaFin = calcularFechaFinPerro(fechaHoyUruguay(), v0.tamaño_bolsa_kg as number, v0.gramos_por_comida as number, v0.veces_al_dia as number).toISOString().split('T')[0]
        }
      } else if (mascota?.intervalo_compra_dias) {
        nuevaFechaFin = calcularFechaFinGato(fechaHoyUruguay(), mascota.intervalo_compra_dias as number).toISOString().split('T')[0]
      }

      await sql`
        INSERT INTO ventas (cliente_id, perro_id, producto, tamaño_bolsa_kg, precio, gramos_por_comida, veces_al_dia, fecha_estimada_fin, cantidad, pagado, alerta_enviada)
        VALUES (${v0.cliente_id as string}, ${v0.perro_id as string}, ${v0.producto as string}, ${v0.tamaño_bolsa_kg as number}, ${v0.precio as number}, ${v0.gramos_por_comida as number | null}, ${v0.veces_al_dia as number | null}, ${nuevaFechaFin}::date, 1, false, false)
      `
      await sendMessage(chatId, nuevaFechaFin
        ? `✅ Recompra registrada. Próxima alerta: ${new Date(nuevaFechaFin + 'T12:00:00').toLocaleDateString('es-UY')}`
        : `✅ Recompra registrada (sin fecha estimada).`)

    // ── esperar ──────────────────────────────────────────────────────
    } else if (accion === 'esperar') {
      await sql`
        INSERT INTO telegram_estados (chat_id, estado, venta_id, updated_at)
        VALUES (${chatId}, 'esperando_dias', ${ventaId}::uuid, now())
        ON CONFLICT (chat_id) DO UPDATE SET estado = 'esperando_dias', venta_id = ${ventaId}::uuid, updated_at = now()
      `
      await sendMessage(chatId, '¿Cuántos días querés que espere para volver a avisar? (respondé solo el número, ej: 7)')

    // ── baja ─────────────────────────────────────────────────────────
    } else if (accion === 'baja') {
      const vRows = await sql`SELECT cliente_id FROM ventas WHERE id = ${ventaId}`
      if (vRows.length) await sql`UPDATE clientes SET activo = false WHERE id = ${vRows[0].cliente_id as string}`
      await sendMessage(chatId, '❌ Cliente dado de baja. No recibirá más alertas.')
    }

    return NextResponse.json({ ok: true })
  }

  // ── Regular message ────────────────────────────────────────────────────
  const message = (body as any)?.message
  if (!message?.chat?.id) return NextResponse.json({ ok: true })

  const chatId = String(message.chat.id)
  let texto: string | null = null

  const voice = message.voice
  const audio = message.audio
  if (voice || audio) {
    const fileId = voice?.file_id || audio?.file_id
    if (!fileId) { await sendMessage(chatId, '❌ No se pudo procesar el audio.'); return NextResponse.json({ ok: true }) }
    if (authorizedIds.length > 0 && !authorizedIds.includes(chatId)) return NextResponse.json({ ok: true })
    await sendMessage(chatId, '🎙️ Procesando audio...')
    const fileInfo = await getFile(fileId)
    if (!fileInfo) { await sendMessage(chatId, '❌ No se pudo obtener el archivo de audio.'); return NextResponse.json({ ok: true }) }
    const audioBuffer = await downloadFile(fileInfo.file_path)
    if (!audioBuffer) { await sendMessage(chatId, '❌ No se pudo descargar el audio.'); return NextResponse.json({ ok: true }) }
    const transcripcion = await transcribeAudioWithClaude(audioBuffer, fileInfo.file_path.split('/').pop() || 'audio.ogg')
    if (!transcripcion) { await sendMessage(chatId, '❌ No se pudo transcribir el audio.'); return NextResponse.json({ ok: true }) }
    texto = transcripcion.slice(0, 2000)
    await sendMessage(chatId, `📝 <i>"${texto}"</i>`)
  } else if (message.text) {
    texto = String(message.text).slice(0, 2000)
  } else {
    return NextResponse.json({ ok: true })
  }

  if (texto.trim() === '/id') {
    await sendMessage(chatId, `Tu chat ID es: <code>${chatId}</code>`)
    return NextResponse.json({ ok: true })
  }

  if (authorizedIds.length > 0 && !authorizedIds.includes(chatId)) return NextResponse.json({ ok: true })

  // ── Estado conversacional ──────────────────────────────────────────────
  const estadoRows = await sql`SELECT * FROM telegram_estados WHERE chat_id = ${chatId}`
  const estadoActual = estadoRows[0]

  if (estadoActual?.estado === 'esperando_dias') {
    const dias = parseInt(texto.trim(), 10)
    if (isNaN(dias) || dias < 1 || dias > 365) {
      await sendMessage(chatId, 'Por favor respondé con un número de días válido (ej: 7)')
      return NextResponse.json({ ok: true })
    }
    const nuevaFecha = fechaHoyUruguay()
    nuevaFecha.setDate(nuevaFecha.getDate() + dias)
    await sql`UPDATE ventas SET fecha_estimada_fin = ${nuevaFecha.toISOString().split('T')[0]}::date, alerta_enviada = false WHERE id = ${estadoActual.venta_id as string}`
    await sql`DELETE FROM telegram_estados WHERE chat_id = ${chatId}`
    await sendMessage(chatId, `⏰ Listo, vuelvo a avisar en ${dias} días (${nuevaFecha.toLocaleDateString('es-UY')})`)
    return NextResponse.json({ ok: true })
  }

  if (estadoActual?.estado === 'esperando_seleccion_producto') {
    const seleccion = parseInt(texto.trim(), 10)
    const payload = estadoActual.payload as any
    const opcionesProducto = payload?.opcionesProducto as ProductoEncontrado[]
    if (!opcionesProducto || isNaN(seleccion) || seleccion < 1 || seleccion > opcionesProducto.length) {
      await sendMessage(chatId, `Por favor respondé con un número del 1 al ${opcionesProducto?.length || '?'}.`)
      return NextResponse.json({ ok: true })
    }
    const prod = opcionesProducto[seleccion - 1]
    const matchTamaño = prod.nombre.match(/(\d+(?:[,\.]\d+)?)\s*kg/i)
    const tamañoBolsaKg = matchTamaño ? parseFloat(matchTamaño[1].replace(',', '.')) : payload.tamañoBolsaKg || 10
    const ventaDataParcial = payload.ventaDataParcial as VentaData
    ventaDataParcial.producto      = prod.nombre
    ventaDataParcial.precio        = prod.precio_venta
    ventaDataParcial.tamañoBolsaKg = tamañoBolsaKg
    await sql`DELETE FROM telegram_estados WHERE chat_id = ${chatId}`
    await procesarVentaConProducto(chatId, ventaDataParcial, payload.dataExtraInline ?? null)
    return NextResponse.json({ ok: true })
  }

  if (estadoActual?.estado === 'esperando_datos_faltantes') {
    const payload          = estadoActual.payload as any
    const ventaDataParcial = payload.ventaDataParcial as VentaData
    const campoEsperado    = payload.campoEsperado as string
    const respuesta        = texto.trim()
    const saltarDato       = /^(no|sin|nada|dejalo|dejalo asi|dejalo así|anotalo asi|anotalo así|skip|saltar|siguiente)$/i.test(respuesta)

    if (!saltarDato) {
      if (campoEsperado === 'telefono') ventaDataParcial.clienteTelefono = respuesta
      if (campoEsperado === 'direccion') ventaDataParcial.clienteDireccion = respuesta
    }

    const siguienteCampo = obtenerSiguienteCampoFaltante(ventaDataParcial, campoEsperado)
    if (siguienteCampo) {
      await sql`UPDATE telegram_estados SET payload = ${JSON.stringify({ ...payload, ventaDataParcial, campoEsperado: siguienteCampo })}, updated_at = now() WHERE chat_id = ${chatId}`
      await sendMessage(chatId, siguienteCampo === 'telefono'
        ? '📱 ¿Cuál es el teléfono del cliente? (o respondé "no" para saltar)'
        : '📍 ¿Cuál es la dirección del cliente? (o respondé "no" para saltar)')
      return NextResponse.json({ ok: true })
    }

    await sql`DELETE FROM telegram_estados WHERE chat_id = ${chatId}`
    await procesarVentaConProducto(chatId, ventaDataParcial, payload.dataExtraInline ?? null)
    return NextResponse.json({ ok: true })
  }

  // ── Extraer "data extra" del mensaje antes de parsear ─────────────────
  let dataExtraInline: string | null = null
  const dataExtraMatch = texto.match(/\by?\s*data\s+extra\s+(.+)/i)
  if (dataExtraMatch) {
    dataExtraInline = dataExtraMatch[1].trim()
    texto = texto.replace(dataExtraMatch[0], '').trim()
  }

  // ── Parse message ──────────────────────────────────────────────────────
  try {
    const resultado = await parsearMensaje(texto)

    // transferencia_interna: crea dos movimientos (sale de un método, entra al otro)
    if (resultado.tipo === 'transferencia_interna') {
      const d = resultado.data as TransferenciaInternaData
      const tk = nuevoToken()
      const payloadStr = JSON.stringify({ ...d, token: tk })
      await sql`
        INSERT INTO telegram_estados (chat_id, estado, venta_id, payload, updated_at)
        VALUES (${chatId}, 'confirmando_transferencia_interna', null, ${payloadStr}, now())
        ON CONFLICT (chat_id) DO UPDATE SET estado = 'confirmando_transferencia_interna', venta_id = null, payload = ${payloadStr}, updated_at = now()
      `
      await sendMessageWithButtons(chatId,
        `${bloqueTransferenciaTexto(d)}\n\n¿Confirmar?`,
        [{ text: '✅ Confirmar', callback_data: `confirmar_transferencia_interna:${tk}` }, { text: '❌ Rechazar', callback_data: `cancelar_transferencia_interna:${tk}` }]
      )
      return NextResponse.json({ ok: true })
    }

    // movimiento_caja siempre tiene ok:true pero lo chequeamos antes por si acaso
    if (resultado.tipo === 'movimiento_caja') {
      const d = resultado.data as MovimientoCajaData
      const tk = nuevoToken()
      const payloadStr = JSON.stringify({ ...d, token: tk })
      await sql`
        INSERT INTO telegram_estados (chat_id, estado, venta_id, payload, updated_at)
        VALUES (${chatId}, 'confirmando_movimiento_caja', null, ${payloadStr}, now())
        ON CONFLICT (chat_id) DO UPDATE SET estado = 'confirmando_movimiento_caja', venta_id = null, payload = ${payloadStr}, updated_at = now()
      `
      await sendMessageWithButtons(chatId,
        `${bloqueMovimientoTexto(d)}\n\n¿Confirmar?`,
        [{ text: '✅ Confirmar', callback_data: `confirmar_movimiento_caja:${tk}` }, { text: '❌ Rechazar', callback_data: `cancelar_movimiento_caja:${tk}` }]
      )
      return NextResponse.json({ ok: true })
    }

    if (!resultado.ok) {
      await sendMessage(chatId, resultado.mensajeRespuesta ?? 'No pude entender el mensaje.')
      return NextResponse.json({ ok: true })
    }

    if (resultado.tipo === 'compra_stock') {
      const c = normalizarCompraStock(resultado.data as CompraStockData)

      const tk = nuevoToken()
      const payloadStr = JSON.stringify({ ...c, token: tk })
      await sql`
        INSERT INTO telegram_estados (chat_id, estado, venta_id, payload, updated_at)
        VALUES (${chatId}, 'confirmando_compra_stock', null, ${payloadStr}, now())
        ON CONFLICT (chat_id) DO UPDATE SET estado = 'confirmando_compra_stock', venta_id = null, payload = ${payloadStr}, updated_at = now()
      `
      await sendMessageWithButtons(chatId,
        `📥 <b>Compra de stock</b>\n\n${bloqueCompraTexto(c)}\n\n¿Confirmar?`,
        [{ text: '✅ Confirmar', callback_data: `confirmar_compra_stock:${tk}` }, { text: '❌ Cancelar', callback_data: `cancelar_compra_stock:${tk}` }]
      )
      return NextResponse.json({ ok: true })
    }

    if (resultado.tipo === 'compras_stock_multiples') {
      const comprasRaw = resultado.compras ?? []
      const compras = comprasRaw.map(normalizarCompraStock)
      if (compras.length === 0) {
        await sendMessage(chatId, 'No pude entender qué productos se compraron. Intentá de nuevo.')
        return NextResponse.json({ ok: true })
      }

      const tk = nuevoToken()
      const payloadStr = JSON.stringify({ compras, token: tk })
      await sql`
        INSERT INTO telegram_estados (chat_id, estado, venta_id, payload, updated_at)
        VALUES (${chatId}, 'confirmando_compras_stock_multiples', null, ${payloadStr}, now())
        ON CONFLICT (chat_id) DO UPDATE SET estado = 'confirmando_compras_stock_multiples', venta_id = null, payload = ${payloadStr}, updated_at = now()
      `
      const bloques = compras.map((c, i) => `<b>${i + 1}.</b> ${bloqueCompraTexto(c)}`).join('\n\n')
      const totalGasto = compras.reduce((s, c) => s + (c.costoTotal ?? 0), 0)
      const totalLinea = totalGasto > 0 ? `\n\n💰 <b>Gasto total: $${totalGasto.toLocaleString('es-UY')}</b>` : ''
      await sendMessageWithButtons(chatId,
        `📥 <b>Compra de stock (${compras.length} productos)</b>\n\n${bloques}${totalLinea}\n\n¿Confirmar?`,
        [{ text: '✅ Confirmar todo', callback_data: `confirmar_compras_stock_multiples:${tk}` }, { text: '❌ Cancelar', callback_data: `cancelar_compra_stock:${tk}` }]
      )
      return NextResponse.json({ ok: true })
    }

    if (resultado.tipo === 'tarea') {
      const d = resultado.data as TareaData
      await sql`INSERT INTO tareas (titulo) VALUES (${d.titulo})`
      await sendMessage(chatId, `✅ <b>Tarea anotada:</b>\n📝 ${d.titulo}`)
      return NextResponse.json({ ok: true })
    }

    if (resultado.tipo === 'data_extra_cliente') {
      const d = resultado.data as DataExtraClienteData
      const cliente = await buscarClienteSimilar(d.clienteNombre)
      if (!cliente) {
        await sendMessage(chatId, `❌ No encontré un cliente con el nombre "${d.clienteNombre}".`)
        return NextResponse.json({ ok: true })
      }
      const cId = cliente.id
      // Concatenar a data_extra existente
      await sql`
        UPDATE clientes SET data_extra = CASE
          WHEN data_extra IS NULL OR data_extra = '' THEN ${d.info}
          ELSE data_extra || E'\n' || ${d.info}
        END
        WHERE id = ${cId}
      `
      // Se muestra el nombre tal cual está en la base, no el que se tipeó:
      // así se nota enseguida si el bot pegó en la ficha equivocada.
      await sendMessage(chatId, `📝 <b>Data extra de ${cliente.nombre} actualizada:</b>\n${d.info}`)
      return NextResponse.json({ ok: true })
    }

    if (resultado.tipo === 'ventas_multiples') {
      const ventas = resultado.ventas!
      const totalPromo = typeof resultado.precioTotalPromo === 'number' && resultado.precioTotalPromo > 0
        ? resultado.precioTotalPromo
        : null
      const esPromo = resultado.esPromo === true && totalPromo !== null

      // Si es promo pero no se entendió el total, NO seguir: caeríamos en los precios
      // de lista y la promo se registraría más cara de lo que se cobró.
      if (resultado.esPromo === true && totalPromo === null) {
        await sendMessage(chatId, '🎁 Entendí que es una promo, pero no me quedó claro el precio total.\n\nReenviá el mensaje con el total, por ejemplo:\n<i>"promo a Pablo: lager adulto 25kg + lager adulto 10kg por 2450"</i>')
        return NextResponse.json({ ok: true })
      }

      // Resolver precios desde BD para cada producto
      const ventasResueltas: VentaData[] = []
      for (const v of ventas) {
        let precio = v.precio
        // OJO: precio 0 es un precio válido (las bolsas incluidas en una promo van en 0),
        // así que hay que distinguir "sin precio" de "precio cero".
        const sinPrecio = precio === null || precio === undefined
        // Siempre buscamos el producto para normalizar el nombre al del catálogo:
        // registrar_venta descuenta stock matcheando por nombre exacto.
        const busqueda = await buscarProductoEnBD(v.producto)
        if (busqueda.exacto && busqueda.encontrados.length === 1) {
          v.producto = busqueda.encontrados[0].nombre
          if (sinPrecio || v.usarPrecioBD) precio = busqueda.encontrados[0].precio_venta
        }
        ventasResueltas.push({ ...v, precio })
      }

      // En una promo el precio total lo reparte el código, no el modelo: va entero
      // en la bolsa más grande y el resto queda en 0 (siguen descontando stock).
      const ventasFinales = esPromo
        ? repartirPrecioPromo(ventasResueltas, totalPromo)
        : ventasResueltas

      const total = totalVentas(ventasFinales)

      // Mostrar una sola confirmación con todos los productos
      let msg = esPromo
        ? `🎁 <b>Promo</b>\n👤 Cliente: ${ventas[0].clienteNombre}\n\n`
        : `📦 <b>Ventas múltiples</b>\n👤 Cliente: ${ventas[0].clienteNombre}\n\n`
      ventasFinales.forEach((v, i) => {
        const detalle = esPromo && v.precio === 0
          ? '<i>incluida en la promo</i>'
          : `$${v.precio ?? '?'}`
        msg += `<b>${i + 1}.</b> ${v.producto} — ${detalle}\n`
      })
      msg += `\n💰 Total: $${total}`
      msg += `\n💳 Pago: ${ventas[0].pagado ? '✅ Pagado' : '⏳ Pendiente'}\n\n¿Confirmar?`

      const tk = nuevoToken()
      const pStr = JSON.stringify({ ventasMultiples: ventasFinales, dataExtraInline, esPromo, token: tk })
      await sql`
        INSERT INTO telegram_estados (chat_id, estado, venta_id, payload, updated_at)
        VALUES (${chatId}, 'confirmando_ventas_multiples', null, ${pStr}, now())
        ON CONFLICT (chat_id) DO UPDATE SET estado = 'confirmando_ventas_multiples', venta_id = null, payload = ${pStr}, updated_at = now()
      `
      await sendMessageWithButtons(chatId, msg, [
        { text: '✅ Confirmar todo', callback_data: `confirmar_ventas_multiples:${tk}` },
        { text: '❌ Cancelar', callback_data: `cancelar_venta:${tk}` },
      ])
      return NextResponse.json({ ok: true })
    }

    if (resultado.tipo === 'editar_venta') {
      const d = resultado.data as EditarVentaData
      const cliente = await buscarClienteSimilar(d.clienteNombre)
      if (!cliente) {
        await sendMessage(chatId, `❌ No encontré un cliente con el nombre "${d.clienteNombre}".`)
        return NextResponse.json({ ok: true })
      }
      const cId = cliente.id
      const cNombre = cliente.nombre

      // Última venta del cliente
      const ventaRows = await sql`SELECT id, producto, precio, cantidad, pagado, metodo_pago FROM ventas WHERE cliente_id = ${cId} ORDER BY fecha_venta DESC, created_at DESC LIMIT 1`
      if (!ventaRows.length) {
        await sendMessage(chatId, `❌ ${cNombre} no tiene ventas registradas para editar.`)
        return NextResponse.json({ ok: true })
      }
      const vId = ventaRows[0].id as string

      // Construir cambios
      const cambios: string[] = []
      // Si menciona método de pago, asumir pagado=true también
      const nuevoPagado = d.pagado === true || d.metodoPago !== null ? true : (d.pagado === false ? false : null)

      if (nuevoPagado !== null) {
        await sql`UPDATE ventas SET pagado = ${nuevoPagado} WHERE id = ${vId}`
        cambios.push(nuevoPagado ? '💳 ✅ Pagado' : '💳 ⏳ Pendiente')
      }
      if (d.metodoPago !== null) {
        await sql`UPDATE ventas SET metodo_pago = ${d.metodoPago} WHERE id = ${vId}`
        cambios.push(d.metodoPago === 'efectivo' ? '💵 Efectivo' : '🏦 Transferencia')
      }
      if (d.precio !== null && d.precio !== undefined) {
        await sql`UPDATE ventas SET precio = ${d.precio} WHERE id = ${vId}`
        cambios.push(`💰 Precio: $${d.precio.toLocaleString('es-UY')}`)
      }
      if (d.cantidad !== null && d.cantidad !== undefined) {
        await sql`UPDATE ventas SET cantidad = ${d.cantidad} WHERE id = ${vId}`
        cambios.push(`📦 Cantidad: ${d.cantidad}`)
      }

      if (cambios.length === 0) {
        await sendMessage(chatId, `⚠️ No entendí qué editar de la venta de ${cNombre}. Probá: "${cNombre} pagó en efectivo".`)
        return NextResponse.json({ ok: true })
      }

      await sendMessage(chatId, `✏️ <b>Venta de ${cNombre} actualizada</b>\n🛍 ${ventaRows[0].producto}\n${cambios.join('\n')}`)
      return NextResponse.json({ ok: true })
    }

    if (resultado.tipo === 'actualizar_cliente') {
      const d = resultado.data as ActualizarClienteData
      const cliente = await buscarClienteSimilar(d.clienteNombre)
      if (!cliente) {
        await sendMessage(chatId, `❌ No encontré un cliente con el nombre "${d.clienteNombre}".`)
        return NextResponse.json({ ok: true })
      }
      const cId = cliente.id
      // Este SÍ es el flujo para cambiar datos a propósito, así que pisa lo que
      // había — pero deja dicho qué valor se reemplazó, por si pegó en la
      // ficha equivocada.
      let mensaje = `✅ Cliente <b>${cliente.nombre}</b> actualizado:\n`
      if (d.telefono) {
        await sql`UPDATE clientes SET telefono = ${d.telefono} WHERE id = ${cId}`
        mensaje += `📱 Teléfono: ${d.telefono}${cliente.telefono ? ` <i>(antes: ${cliente.telefono})</i>` : ''}\n`
      }
      if (d.direccion) {
        await sql`UPDATE clientes SET direccion = ${d.direccion} WHERE id = ${cId}`
        mensaje += `📍 Dirección: ${d.direccion}${cliente.direccion ? ` <i>(antes: ${cliente.direccion})</i>` : ''}\n`
      }
      const fichas = await contarFichasDelMismoNombre(cliente.nombre)
      if (fichas > 1) mensaje += `⚠️ Hay ${fichas} fichas con este nombre — conviene unificarlas.\n`
      await sendMessage(chatId, mensaje)
      return NextResponse.json({ ok: true })
    }

    const d = resultado.data as VentaData
    const faltanteProducto = resultado.faltanteProducto
    const necesitaBuscarEnBD = d.precio === null || d.usarPrecioBD || (faltanteProducto && (faltanteProducto.faltaMarca || faltanteProducto.faltaTamaño))

    if (necesitaBuscarEnBD) {
      let productosEncontrados: ProductoEncontrado[] = []

      if (faltanteProducto && (faltanteProducto.faltaMarca || faltanteProducto.faltaTamaño)) {
        productosEncontrados = await buscarProductosPorCriterios(
          faltanteProducto.marcaMencionada, faltanteProducto.tipoProductoMencionado, faltanteProducto.tamañoMencionado
        )
      } else {
        const busqueda = await buscarProductoEnBD(d.producto)
        productosEncontrados = busqueda.encontrados
        if (busqueda.exacto && productosEncontrados.length === 1) {
          d.precio = productosEncontrados[0].precio_venta
          await procesarVentaConProducto(chatId, d, dataExtraInline)
          return NextResponse.json({ ok: true })
        }
      }

      if (productosEncontrados.length === 0) {
        let msg = '❌ No encontré el producto en la base de datos.\n\n'
        if (faltanteProducto?.faltaMarca)  msg += '¿Cuál es la marca? (Lager, Maxine, Connie, Wits, Toky)\n'
        if (faltanteProducto?.faltaTamaño) msg += '¿De qué tamaño es la bolsa? (ej: 10 kg, 21 kg, 25 kg)\n'
        msg += '\nReenviá el mensaje con la información completa.'
        await sendMessage(chatId, msg)
        return NextResponse.json({ ok: true })
      }

      if (productosEncontrados.length > 1) {
        let msg = '🔍 Encontré varios productos. ¿Cuál es?\n\n'
        productosEncontrados.forEach((p, i) => { msg += `<b>${i + 1}.</b> ${p.nombre} — $${p.precio_venta}\n` })
        msg += '\nRespondé con el número del producto.'
        const pStr = JSON.stringify({ opcionesProducto: productosEncontrados, ventaDataParcial: d, dataExtraInline })
        await sql`
          INSERT INTO telegram_estados (chat_id, estado, venta_id, payload, updated_at)
          VALUES (${chatId}, 'esperando_seleccion_producto', null, ${pStr}, now())
          ON CONFLICT (chat_id) DO UPDATE SET estado = 'esperando_seleccion_producto', venta_id = null, payload = ${pStr}, updated_at = now()
        `
        await sendMessage(chatId, msg)
        return NextResponse.json({ ok: true })
      }

      const productoUnico = productosEncontrados[0]
      d.producto = productoUnico.nombre
      d.precio   = productoUnico.precio_venta
      if (!d.tamañoBolsaKg) {
        const m = productoUnico.nombre.match(/(\d+(?:[,\.]\d+)?)\s*kg/i)
        if (m) d.tamañoBolsaKg = parseFloat(m[1].replace(',', '.'))
      }
    }

    if (d.precio === null || d.precio === undefined) {
      await sendMessage(chatId, '❌ No encontré el producto en la base de datos. Indicá el precio o verificá el nombre del producto.')
      return NextResponse.json({ ok: true })
    }

    await procesarVentaConProducto(chatId, d, dataExtraInline)
  } catch (err) {
    console.error('Webhook error:', err)
    await sendMessage(chatId, '❌ Ocurrió un error al procesar el mensaje. Revisá los logs.')
  }

  return NextResponse.json({ ok: true })
}

// ── Helpers compra de stock ─────────────────────────────────────────────────

type CompraNormalizada = {
  producto: string
  distribucion: { casa: string; cantidad: number }[]
  cantidadTotal: number
  costoTotal: number | null
  pagado: boolean
  metodoPago: string | null
  fechaLimitePago: string | null
}

// Normaliza una compra parseada: arma distribución entre casas, costo total y datos de pago.
function normalizarCompraStock(d: CompraStockData): CompraNormalizada {
  const distribucionValida =
    Array.isArray(d.distribucion) && d.distribucion.length > 0
      ? d.distribucion.filter(x => x && (x.cantidad as number) > 0)
      : null
  const distribucion = distribucionValida && distribucionValida.length > 0
    ? distribucionValida.map(x => ({
        casa: x.casa === 'departamento' ? 'departamento' : 'shangrila',
        cantidad: x.cantidad,
      }))
    : [{ casa: d.casa === 'departamento' ? 'departamento' : 'shangrila', cantidad: d.cantidad }]

  const cantidadTotal = distribucion.reduce((sum, x) => sum + (x.cantidad as number), 0)
  const costoTotal = (d.costoTotal && d.costoTotal > 0)
    ? d.costoTotal
    : (d.precio && d.precio > 0 ? d.precio * cantidadTotal : null)
  const pagado = d.pagado !== false
  const metodoPago = d.metodoPago ?? null

  let fechaLimitePago: string | null = null
  if (d.fechaLimitePago) {
    fechaLimitePago = d.fechaLimitePago
  } else if (d.diasParaPago && d.diasParaPago > 0) {
    const limite = fechaHoyUruguay()
    limite.setDate(limite.getDate() + d.diasParaPago)
    fechaLimitePago = limite.toISOString().split('T')[0]
  }

  return { producto: d.producto, distribucion, cantidadTotal, costoTotal, pagado, metodoPago, fechaLimitePago }
}

// Texto del bloque de confirmación de una compra.
function bloqueCompraTexto(c: CompraNormalizada): string {
  const casaLineas = c.distribucion
    .map(x => `${x.casa === 'departamento' ? '🏢 Departamento' : '🏠 Shangrila'}: ${x.cantidad} bolsa${x.cantidad > 1 ? 's' : ''}`)
    .join('\n')
  const costoLinea = c.costoTotal ? `\n💸 Costo: $${c.costoTotal.toLocaleString('es-UY')}` : ''
  const metodoLinea = c.metodoPago ? ` (${c.metodoPago === 'transferencia' ? '🏦 transferencia' : '💵 efectivo'})` : ''
  const pagoLinea = c.costoTotal
    ? (c.pagado
        ? `\n💳 ✅ Pagado${metodoLinea}`
        : `\n💳 ⏳ NO pagado${c.fechaLimitePago ? ` · vence ${new Date(c.fechaLimitePago + 'T12:00:00').toLocaleDateString('es-UY')}` : ''}`)
    : ''
  return `🛍 <b>${c.producto}</b> — ${c.cantidadTotal} bolsa${c.cantidadTotal > 1 ? 's' : ''}\n${casaLineas}${costoLinea}${pagoLinea}`
}

function bloqueMovimientoTexto(d: MovimientoCajaData): string {
  const emoji = d.categoria === 'egreso' ? '💸' : '💰'
  const titulo = d.categoria === 'egreso' ? 'Gasto' : 'Ingreso'
  const signo = d.categoria === 'egreso' ? '-' : '+'
  const metodoPagoTexto = d.metodoPago === 'efectivo' ? ' · 💵 Efectivo' : d.metodoPago === 'transferencia' ? ' · 🏦 Transferencia' : ''
  const etiquetaTexto = d.etiqueta ? ` · 🏷️ ${d.etiqueta}` : ''
  const fechaEfectiva = d.fecha ?? fechaHoyUruguay().toISOString().split('T')[0]
  const fechaTexto = `\n📅 ${new Date(fechaEfectiva + 'T12:00:00').toLocaleDateString('es-UY')}`
  const pagoTexto = `\n💳 ${d.pagado ? '✅ Pagado' : '⏳ NO pagado'}`
  return `${emoji} <b>${titulo}</b>\n📝 ${d.descripcion}\n💵 ${signo}$${d.monto.toLocaleString('es-UY')}${metodoPagoTexto}${etiquetaTexto}${fechaTexto}${pagoTexto}`
}

function bloqueTransferenciaTexto(d: TransferenciaInternaData): string {
  const deLabel = d.de === 'efectivo' ? '💵 Efectivo' : '🏦 Banco'
  const aLabel = d.a === 'efectivo' ? '💵 Efectivo' : '🏦 Banco'
  return `🔄 <b>Transferencia interna</b>\n💸 Sale de ${deLabel}: -$${d.monto.toLocaleString('es-UY')}\n💰 Entra a ${aLabel}: +$${d.monto.toLocaleString('es-UY')}`
}

// Aplica una compra: suma stock por casa y registra el gasto en caja. Devuelve resumen.
async function aplicarCompraStock(c: any): Promise<{ ok: boolean; resumen: string }> {
  const distribucion: { casa: string; cantidad: number }[] =
    Array.isArray(c.distribucion) && c.distribucion.length > 0
      ? c.distribucion
      : [{ casa: c.casa === 'departamento' ? 'departamento' : 'shangrila', cantidad: c.cantidad }]
  const cantidadTotal = (c.cantidadTotal as number) ?? distribucion.reduce((s, x) => s + x.cantidad, 0)

  const productoRows = await sql`SELECT id, stock_shangrila, stock_departamento FROM productos WHERE lower(nombre) = lower(${c.producto}) LIMIT 1`
  if (!productoRows.length) {
    return { ok: false, resumen: `⚠️ "<b>${c.producto}</b>" no encontrado en el catálogo.` }
  }

  let stockShangrila = productoRows[0].stock_shangrila as number
  let stockDepartamento = productoRows[0].stock_departamento as number
  for (const x of distribucion) {
    if (x.casa === 'departamento') stockDepartamento += x.cantidad
    else stockShangrila += x.cantidad
  }
  const stockTotal = stockShangrila + stockDepartamento
  await sql`UPDATE productos SET stock_shangrila = ${stockShangrila}, stock_departamento = ${stockDepartamento}, stock_actual = ${stockTotal} WHERE id = ${productoRows[0].id as string}`

  let gastoLinea = ''
  const costoTotal = c.costoTotal as number | null
  if (costoTotal && costoTotal > 0) {
    const pagado = c.pagado !== false
    const descripcion = `Compra stock: ${c.producto} ×${cantidadTotal}`
    await sql`
      INSERT INTO movimientos_caja (descripcion, monto, categoria, metodo_pago, etiqueta, pagado, fecha_limite_pago)
      VALUES (${descripcion}, ${costoTotal}, ${'egreso'}, ${c.metodoPago ?? null}, ${'Compra stock'}, ${pagado}, ${c.fechaLimitePago ?? null}::date)
    `
    gastoLinea = pagado
      ? ` · 💸 $${costoTotal.toLocaleString('es-UY')} (✅ pagado)`
      : ` · 💸 $${costoTotal.toLocaleString('es-UY')} (⏳ no pagado${c.fechaLimitePago ? `, vence ${new Date(c.fechaLimitePago + 'T12:00:00').toLocaleDateString('es-UY')}` : ''})`
  }

  return { ok: true, resumen: `📦 <b>${c.producto}</b> → 🏠 ${stockShangrila} / 🏢 ${stockDepartamento}${gastoLinea}` }
}

// ── Estado pendiente (confirmaciones) ──────────────────────────────────────

// Token corto que viaja en el botón y también queda guardado en el payload.
// Sirve para que un botón viejo no confirme una operación nueva: sólo hay un
// estado pendiente por chat, así que si mandás otro mensaje antes de tocar
// "Confirmar", el pendiente se pisa y el botón del mensaje anterior queda
// apuntando a otra cosa. Antes eso registraba lo que no era.
function nuevoToken(): string {
  return Math.random().toString(36).slice(2, 10)
}

type EstadoPendiente =
  | { ok: true; payload: any }
  | { ok: false; mensaje: string }

async function leerEstadoPendiente(
  chatId: string,
  estadoEsperado: string,
  token: string | undefined
): Promise<EstadoPendiente> {
  const rows = await sql`SELECT estado, payload FROM telegram_estados WHERE chat_id = ${chatId}`
  if (!rows.length || !rows[0].payload) {
    return { ok: false, mensaje: '⚠️ No hay nada pendiente de confirmación.' }
  }
  if (rows[0].estado !== estadoEsperado) {
    return { ok: false, mensaje: '⚠️ Ese botón ya no vale: quedó pendiente otra operación más nueva. Usá los botones del último mensaje.' }
  }
  const payload = rows[0].payload as any
  if (payload?.token && token && payload.token !== token) {
    return { ok: false, mensaje: '⚠️ Ese botón es de un mensaje viejo. Usá los botones del último mensaje.' }
  }
  return { ok: true, payload }
}

// Borra el pendiente sólo si es el que corresponde al botón apretado, para que
// cancelar un mensaje viejo no tire abajo una confirmación más nueva.
async function borrarEstadoSiCorresponde(
  chatId: string,
  estadosEsperados: string[],
  token: string | undefined
): Promise<boolean> {
  const rows = await sql`SELECT estado, payload FROM telegram_estados WHERE chat_id = ${chatId}`
  if (!rows.length) return false
  if (!estadosEsperados.includes(rows[0].estado as string)) return false
  const payload = rows[0].payload as any
  if (payload?.token && token && payload.token !== token) return false
  await sql`DELETE FROM telegram_estados WHERE chat_id = ${chatId}`
  return true
}

// ── Alta de cliente y mascota (al CONFIRMAR, nunca antes) ──────────────────

interface DatosClienteMascota {
  clienteId: string | null
  clienteNombre: string
  clienteTelefono: string | null
  clienteDireccion: string | null
  perroId: string | null
  mascotaNombre: string | null
  especie: string
  tipoPerro: string | null
  pesoKg: number | null
}

// Crea o recupera el cliente y la mascota. Se llama SOLO desde los handlers de
// confirmación: si el usuario cancela, no queda nada escrito en la base.
async function resolverClienteYMascota(
  p: DatosClienteMascota
): Promise<{ clienteId: string; perroId: string; nombre: string; telefono: string | null; direccion: string | null; avisos: string[] }> {
  const avisos: string[] = []

  let cliente: ClienteEncontrado | null = null
  if (p.clienteId) {
    const rows = await sql`SELECT id, nombre, telefono, direccion, activo FROM clientes WHERE id = ${p.clienteId}`
    cliente = (rows[0] as unknown as ClienteEncontrado) ?? null
  }
  if (!cliente) cliente = await buscarClienteSimilar(p.clienteNombre)

  let clienteId: string
  if (cliente) {
    clienteId = cliente.id
    if (!cliente.activo) await sql`UPDATE clientes SET activo = true WHERE id = ${clienteId}`
    const { completados, conflictos } = await completarDatosContacto(cliente, p.clienteTelefono, p.clienteDireccion)
    avisos.push(...completados, ...conflictos)
  } else {
    const nuevo = await sql`
      INSERT INTO clientes (nombre, telefono, direccion, activo)
      VALUES (${p.clienteNombre}, ${p.clienteTelefono ?? null}, ${p.clienteDireccion ?? null}, true)
      RETURNING id`
    clienteId = nuevo[0].id as string
    avisos.push(`🆕 Cliente nuevo: ${p.clienteNombre}`)
  }

  let perroId: string | null = null
  if (p.perroId) {
    const rows = await sql`SELECT id FROM perros WHERE id = ${p.perroId} AND cliente_id = ${clienteId}`
    perroId = (rows[0]?.id as string) ?? null
  }
  if (!perroId) {
    const rows = p.mascotaNombre
      ? await sql`SELECT id FROM perros WHERE cliente_id = ${clienteId} AND lower(nombre) = lower(${p.mascotaNombre}) ORDER BY created_at ASC LIMIT 1`
      : await sql`SELECT id FROM perros WHERE cliente_id = ${clienteId} AND especie = ${p.especie} ORDER BY created_at ASC LIMIT 1`
    perroId = (rows[0]?.id as string) ?? null
  }
  if (!perroId) {
    const nombreMascota = p.mascotaNombre ?? (p.especie === 'perro' ? 'Perro' : 'Gato')
    const nueva = await sql`
      INSERT INTO perros (cliente_id, nombre, especie, tipo, peso_kg)
      VALUES (${clienteId}, ${nombreMascota}, ${p.especie}, ${p.tipoPerro ?? null}, ${p.pesoKg ?? null})
      RETURNING id`
    perroId = nueva[0].id as string
  } else {
    // Completar sólo lo que está vacío: el peso o el tipo cargados a mano
    // valen más que lo que se deduzca de un mensaje suelto.
    if (p.tipoPerro) await sql`UPDATE perros SET tipo = ${p.tipoPerro} WHERE id = ${perroId} AND tipo IS NULL`
    if (p.pesoKg != null) await sql`UPDATE perros SET peso_kg = ${p.pesoKg} WHERE id = ${perroId} AND peso_kg IS NULL`
  }

  // Datos finales tal como quedaron guardados: es lo que se manda a la planilla,
  // para que la fila no diga una dirección que la base no tiene.
  const finales = await sql`SELECT nombre, telefono, direccion FROM clientes WHERE id = ${clienteId}`
  return {
    clienteId,
    perroId,
    nombre: (finales[0]?.nombre as string) ?? p.clienteNombre,
    telefono: (finales[0]?.telefono as string | null) ?? null,
    direccion: (finales[0]?.direccion as string | null) ?? null,
    avisos,
  }
}

// ── procesarVentaConProducto ───────────────────────────────────────────────

// Arma la confirmación de una venta. NO escribe nada en la base: sólo lee para
// mostrar contra qué ficha se va a registrar. El alta real pasa en el handler
// de "confirmar_venta".
async function procesarVentaConProducto(chatId: string, d: VentaData, dataExtraInline: string | null = null) {
  const clienteExistente = await buscarClienteSimilar(d.clienteNombre)
  const nombreTipeado = d.clienteNombre

  let clienteId: string | null = null
  let avisoCliente = ''

  if (clienteExistente) {
    clienteId = clienteExistente.id
    // Usar el nombre canónico de la BD (así la confirmación muestra el cliente real)
    d.clienteNombre = clienteExistente.nombre
    if (clienteExistente.nombre.toLowerCase() !== nombreTipeado.toLowerCase()) {
      avisoCliente = `\n<i>(lo asocié a la ficha existente "${clienteExistente.nombre}")</i>`
    }
    const fichas = await contarFichasDelMismoNombre(clienteExistente.nombre)
    if (fichas > 1) {
      avisoCliente += `\n⚠️ <i>Hay ${fichas} fichas con este nombre — conviene unificarlas</i>`
    }
  } else {
    avisoCliente = '\n🆕 <i>Cliente nuevo (se crea al confirmar)</i>'
  }

  // Mascota: buscar por nombre si lo dieron, o por especie si el cliente ya tiene una
  let mascota: { id: string; nombre: string; tipo: string | null; peso_kg: string | null; intervalo_compra_dias: number | null } | null = null
  if (clienteId) {
    const rows = d.mascotaNombre
      ? await sql`SELECT id, nombre, tipo, peso_kg, intervalo_compra_dias FROM perros WHERE cliente_id = ${clienteId} AND lower(nombre) = lower(${d.mascotaNombre}) ORDER BY created_at ASC LIMIT 1`
      : await sql`SELECT id, nombre, tipo, peso_kg, intervalo_compra_dias FROM perros WHERE cliente_id = ${clienteId} AND especie = ${d.especie} ORDER BY created_at ASC LIMIT 1`
    mascota = (rows[0] as any) ?? null
  }

  const perroId = mascota?.id ?? null
  if (mascota && !d.mascotaNombre) d.mascotaNombre = mascota.nombre

  // Datos de la mascota ya guardados como respaldo: un mensaje del día a día
  // ("otra bolsa para rocky") no repite raza ni peso, y sin esto la venta
  // quedaba sin fecha de fin de bolsa y por lo tanto sin alerta.
  const tipoPerroEfectivo = d.tipoPerro ?? mascota?.tipo ?? null
  const pesoEfectivo      = d.pesoKg ?? (mascota?.peso_kg != null ? Number(mascota.peso_kg) : null)
  const intervaloGato     = d.intervaloDiasGato ?? mascota?.intervalo_compra_dias ?? null

  let fechaFin: string | null = null
  let gramosDiariosUsados: number | null = null

  // Si el usuario indicó una fecha de venta, el fin de bolsa se calcula desde ahí (no desde hoy)
  const baseVenta = d.fechaVenta ? new Date(d.fechaVenta + 'T12:00:00') : fechaHoyUruguay()

  if (d.especie === 'perro') {
    const gramosDeTabla = await obtenerGramosDiariosDeTabla(tipoPerroEfectivo, pesoEfectivo)
    if (gramosDeTabla) {
      gramosDiariosUsados = gramosDeTabla
      fechaFin = calcularFechaFinPorGramosDia(baseVenta, d.tamañoBolsaKg, gramosDeTabla).toISOString().split('T')[0]
    } else if (d.gramosPorComida && d.vecesAlDia) {
      gramosDiariosUsados = d.gramosPorComida * d.vecesAlDia
      fechaFin = calcularFechaFinPerro(baseVenta, d.tamañoBolsaKg, d.gramosPorComida, d.vecesAlDia).toISOString().split('T')[0]
    }
  } else if (d.especie === 'gato' && intervaloGato) {
    fechaFin = calcularFechaFinGato(baseVenta, intervaloGato).toISOString().split('T')[0]
  }

  const casaNormalizada = d.casa ?? 'shangrila'
  const stockRows = await sql`SELECT stock_actual, stock_shangrila, stock_departamento FROM productos WHERE lower(nombre) = lower(${d.producto}) LIMIT 1`
  const stockCasa = stockRows.length ? (casaNormalizada === 'departamento' ? stockRows[0].stock_departamento as number : stockRows[0].stock_shangrila as number) : 0
  const casaLabel = casaNormalizada === 'departamento' ? '🏢 Departamento' : '🏠 Shangrila'
  const stockWarning = (stockRows.length && stockCasa < d.cantidad)
    ? `\n⚠️ Solo hay ${stockCasa} bolsa${stockCasa !== 1 ? 's' : ''} en ${casaLabel}`
    : ''

  const token = nuevoToken()
  const payload = {
    token,
    clienteId, perroId, producto: d.producto, tamañoBolsaKg: d.tamañoBolsaKg,
    precio: d.precio, cantidad: d.cantidad, pagado: d.pagado, metodoPago: d.metodoPago ?? null,
    fechaVenta: d.fechaVenta ?? null,
    gramosPorComida: d.gramosPorComida, vecesAlDia: d.vecesAlDia,
    gramosDiarios: gramosDiariosUsados, fechaFin,
    clienteNombre: d.clienteNombre, clienteTelefono: d.clienteTelefono ?? null,
    clienteDireccion: d.clienteDireccion ?? null, mascotaNombre: d.mascotaNombre ?? null,
    especie: d.especie, tipoPerro: tipoPerroEfectivo, pesoKg: pesoEfectivo,
    casa: casaNormalizada,
    dataExtraInline,
  }

  const pStr = JSON.stringify(payload)
  await sql`
    INSERT INTO telegram_estados (chat_id, estado, venta_id, payload, updated_at)
    VALUES (${chatId}, 'confirmando_venta', null, ${pStr}, now())
    ON CONFLICT (chat_id) DO UPDATE SET estado = 'confirmando_venta', venta_id = null, payload = ${pStr}, updated_at = now()
  `

  const pagoTexto     = d.pagado ? '✅ Pagado' : '⏳ Pendiente'
  const cantidadTexto = d.cantidad > 1 ? ` × ${d.cantidad}` : ''
  const totalTexto    = d.cantidad > 1 ? ` (total: $${d.precio! * d.cantidad})` : ''
  const pesoTexto     = pesoEfectivo ? `, ${pesoEfectivo}kg` : ''
  const mascotaNueva  = perroId ? '' : ' 🆕'

  // La dirección del mensaje no pisa la que ya está cargada: se avisa y listo.
  let direccionTexto = ''
  if (d.clienteDireccion) {
    if (!clienteExistente || !clienteExistente.direccion) {
      direccionTexto = `\n📍 Dirección: ${d.clienteDireccion}`
    } else if (clienteExistente.direccion.trim().toLowerCase() !== d.clienteDireccion.trim().toLowerCase()) {
      direccionTexto = `\n📍 Dirección guardada: ${clienteExistente.direccion}\n⚠️ <i>El mensaje decía "${d.clienteDireccion}" — NO la cambio. Para cambiarla mandá: "la dirección de ${d.clienteNombre} es ..."</i>`
    } else {
      direccionTexto = `\n📍 Dirección: ${clienteExistente.direccion}`
    }
  } else if (clienteExistente?.direccion) {
    direccionTexto = `\n📍 Dirección: ${clienteExistente.direccion}`
  }

  const fechaVentaEfectiva = d.fechaVenta ?? fechaHoyUruguayISO()
  const fechaVentaTexto = `\n📅 Fecha venta: ${new Date(fechaVentaEfectiva + 'T12:00:00').toLocaleDateString('es-UY')}`
  const finBolsaTexto = fechaFin
    ? `\n📆 Fin de bolsa estimado: ${new Date(fechaFin + 'T12:00:00').toLocaleDateString('es-UY')}`
    : '\n📆 Fin de bolsa: sin estimar (falta raza o peso de la mascota)'

  await sendMessageWithButtons(chatId,
    `📦 <b>Nueva venta</b>\n\n👤 Cliente: ${d.clienteNombre}${avisoCliente}${direccionTexto}\n🐾 Mascota: ${d.mascotaNombre ?? (d.especie === 'perro' ? 'Perro' : 'Gato')}${mascotaNueva} (${d.especie}${pesoTexto})\n🛍 Producto: ${d.producto}${cantidadTexto}\n💰 Precio: $${d.precio}${totalTexto}\n💳 Pago: ${pagoTexto}${fechaVentaTexto}${finBolsaTexto}\n${casaLabel} Stock: baja de ${casaLabel}${stockWarning}\n\n¿Confirmar?`,
    [{ text: '✅ Confirmar', callback_data: `confirmar_venta:${token}` }, { text: '❌ Cancelar', callback_data: `cancelar_venta:${token}` }]
  )
}
