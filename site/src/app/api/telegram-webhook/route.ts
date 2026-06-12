import { NextRequest, NextResponse } from 'next/server'
import { parsearMensaje, type VentaData, type CompraStockData, type ActualizarClienteData, type EditarVentaData, type MovimientoCajaData, type TransferenciaInternaData, type DataExtraClienteData, type TareaData, type FaltanteProducto, type ParseResult } from '@/lib/claude-parser'
import { sendMessage, sendMessageWithButtons, answerCallbackQuery, deleteMessage, getFile, downloadFile, transcribeAudioWithClaude, getAuthorizedChatIds } from '@/lib/telegram'
import { appendVentaToSheet } from '@/lib/google-sheets'
import { sql } from '@/lib/db'
import { calcularFechaFinPerro, calcularFechaFinGato, calcularFechaFinPorGramosDia, fechaHoyUruguay, fechaHoyUruguayISO } from '@/lib/calculations'

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

  const rows = await sql`
    SELECT gramos_min, gramos_max FROM tabla_gramos
    WHERE tipo_perro = ${tipoNormalizado}
      AND peso_min_kg <= ${pesoKg}
      AND peso_max_kg >= ${pesoKg}
    LIMIT 1
  `
  if (!rows.length) return null
  return Math.round(((rows[0].gramos_min as number) + (rows[0].gramos_max as number)) / 2)
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

// Busca un cliente por nombre: primero match exacto, luego el más parecido
// (tolera typos / acentos / variaciones de apellido) usando similitud de trigramas.
// Devuelve null si no hay ninguno lo bastante parecido → se crea uno nuevo.
async function buscarClienteSimilar(
  nombre: string
): Promise<{ id: string; nombre: string; activo: boolean } | null> {
  const exacto = await sql`SELECT id, nombre, activo FROM clientes WHERE lower(nombre) = lower(${nombre}) LIMIT 1`
  if (exacto.length) return exacto[0] as { id: string; nombre: string; activo: boolean }

  const similar = await sql`
    SELECT id, nombre, activo
    FROM clientes
    WHERE similarity(lower(nombre), lower(${nombre})) >= 0.4
    ORDER BY similarity(lower(nombre), lower(${nombre})) DESC
    LIMIT 1
  `
  return similar.length ? (similar[0] as { id: string; nombre: string; activo: boolean }) : null
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
    const [accion, ventaId] = data.split(':')

    await answerCallbackQuery(callbackQueryId)

    // ── confirmar_venta ──────────────────────────────────────────────
    if (accion === 'confirmar_venta') {
      if (messageId) await deleteMessage(chatId, messageId)

      const estados = await sql`SELECT payload FROM telegram_estados WHERE chat_id = ${chatId}`
      if (!estados.length || !estados[0].payload) {
        await sendMessage(chatId, '⚠️ No hay venta pendiente de confirmación.')
        return NextResponse.json({ ok: true })
      }
      const p = estados[0].payload as any

      const ventaRows = await sql`SELECT registrar_venta(
        ${p.clienteId}::uuid, ${p.perroId}::uuid, ${p.producto},
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
          fechaVenta: fechaHoyUruguayISO(), fechaEstimadaFin: p.fechaFin,
        })
      } catch (e) { console.error('Sheets sync error (non-fatal):', e) }

      const stockRows = await sql`SELECT stock_actual FROM productos WHERE lower(nombre) = lower(${p.producto}) LIMIT 1`
      if (stockRows.length && (stockRows[0].stock_actual as number) <= 0) {
        for (const id of getAuthorizedChatIds()) {
          await sendMessage(id, `⚠️ Stock de <b>${p.producto}</b> llegó a 0.`)
        }
      }

      const respuesta = p.fechaFin
        ? `✅ Venta registrada\n📅 Fin de bolsa estimado: ${new Date(p.fechaFin + 'T12:00:00').toLocaleDateString('es-UY')}\n⚠️ Alerta programada para 7 días antes`
        : `✅ Venta registrada\n(Sin fecha estimada)`
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
      if (messageId) await deleteMessage(chatId, messageId)

      const estados = await sql`SELECT payload FROM telegram_estados WHERE chat_id = ${chatId}`
      if (!estados.length || !estados[0].payload) {
        await sendMessage(chatId, '⚠️ No hay ventas pendientes de confirmación.')
        return NextResponse.json({ ok: true })
      }
      const p = estados[0].payload as any
      await sql`DELETE FROM telegram_estados WHERE chat_id = ${chatId}`

      let registradas = 0
      for (const v of p.ventasMultiples as VentaData[]) {
        // Buscar o crear cliente (con detección de nombres parecidos)
        const clienteExistente = await buscarClienteSimilar(v.clienteNombre)
        let clienteId: string
        if (clienteExistente) {
          clienteId = clienteExistente.id
          v.clienteNombre = clienteExistente.nombre
          if (!clienteExistente.activo) await sql`UPDATE clientes SET activo = true WHERE id = ${clienteId}`
          if (v.clienteDireccion) await sql`UPDATE clientes SET direccion = ${v.clienteDireccion} WHERE id = ${clienteId}`
          if (v.clienteTelefono)  await sql`UPDATE clientes SET telefono  = ${v.clienteTelefono}  WHERE id = ${clienteId}`
        } else {
          const nuevo = await sql`INSERT INTO clientes (nombre, telefono, direccion, activo) VALUES (${v.clienteNombre}, ${v.clienteTelefono ?? null}, ${v.clienteDireccion ?? null}, true) RETURNING id`
          clienteId = nuevo[0].id as string
        }
        // Buscar o crear mascota
        let mascotaRows = await sql`SELECT id FROM perros WHERE cliente_id = ${clienteId} AND especie = ${v.especie} LIMIT 1`
        let perroId: string
        if (mascotaRows.length) {
          perroId = mascotaRows[0].id as string
        } else {
          const nueva = await sql`INSERT INTO perros (cliente_id, nombre, especie) VALUES (${clienteId}, ${v.mascotaNombre ?? (v.especie === 'perro' ? 'Perro' : 'Gato')}, ${v.especie}) RETURNING id`
          perroId = nueva[0].id as string
        }
        // Calcular fecha fin
        let fechaFin: string | null = null
        if (v.especie === 'perro') {
          const g = await obtenerGramosDiariosDeTabla(v.tipoPerro, v.pesoKg)
          if (g) fechaFin = calcularFechaFinPorGramosDia(fechaHoyUruguay(), v.tamañoBolsaKg, g).toISOString().split('T')[0]
        }
        if (v.precio === null || v.precio === undefined) {
          await sendMessage(chatId, `⚠️ No encontré el precio de "<b>${v.producto}</b>". Esa venta no se registró — registrala por separado con el precio.`)
          continue
        }
        await sql`SELECT registrar_venta(${clienteId}::uuid, ${perroId}::uuid, ${v.producto}, ${v.tamañoBolsaKg}, ${v.precio}, ${null}, ${null}, ${fechaFin}::date, 1, ${v.pagado}, ${v.casa ?? 'shangrila'})`
        if (v.metodoPago) {
          const vRows = await sql`SELECT id FROM ventas WHERE cliente_id = ${clienteId} ORDER BY fecha_venta DESC LIMIT 1`
          if (vRows.length) await sql`UPDATE ventas SET metodo_pago = ${v.metodoPago} WHERE id = ${vRows[0].id as string}`
        }
        if (p.dataExtraInline && registradas === 0) {
          await sql`UPDATE clientes SET data_extra = CASE WHEN data_extra IS NULL OR data_extra = '' THEN ${p.dataExtraInline} ELSE data_extra || E'\n' || ${p.dataExtraInline} END WHERE id = ${clienteId}`
        }
        registradas++
      }
      await sendMessage(chatId, `✅ ${registradas} ventas registradas para <b>${(p.ventasMultiples as VentaData[])[0].clienteNombre}</b>`)

    // ── cancelar_venta ───────────────────────────────────────────────
    } else if (accion === 'cancelar_venta') {
      if (messageId) await deleteMessage(chatId, messageId)
      await sql`DELETE FROM telegram_estados WHERE chat_id = ${chatId}`
      await sendMessage(chatId, '❌ Venta cancelada.')

    // ── confirmar_compra_stock ───────────────────────────────────────
    } else if (accion === 'confirmar_compra_stock') {
      if (messageId) await deleteMessage(chatId, messageId)

      const estados = await sql`SELECT payload FROM telegram_estados WHERE chat_id = ${chatId}`
      if (!estados.length || !estados[0].payload) {
        await sendMessage(chatId, '⚠️ No hay compra pendiente de confirmación.')
        return NextResponse.json({ ok: true })
      }
      const p = estados[0].payload as any
      await sql`DELETE FROM telegram_estados WHERE chat_id = ${chatId}`

      const res = await aplicarCompraStock(p)
      await sendMessage(chatId, res.ok ? `✅ Stock actualizado.\n${res.resumen}` : res.resumen)

    // ── confirmar_compras_stock_multiples ────────────────────────────
    } else if (accion === 'confirmar_compras_stock_multiples') {
      if (messageId) await deleteMessage(chatId, messageId)

      const estados = await sql`SELECT payload FROM telegram_estados WHERE chat_id = ${chatId}`
      if (!estados.length || !estados[0].payload) {
        await sendMessage(chatId, '⚠️ No hay compra pendiente de confirmación.')
        return NextResponse.json({ ok: true })
      }
      const p = estados[0].payload as any
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
      if (messageId) await deleteMessage(chatId, messageId)
      await sql`DELETE FROM telegram_estados WHERE chat_id = ${chatId}`
      await sendMessage(chatId, '❌ Compra cancelada.')

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
      await sql`
        INSERT INTO movimientos_caja (descripcion, monto, categoria, metodo_pago)
        VALUES (${'Transferencia interna'}, ${d.monto}, ${'egreso'}, ${d.de})
      `
      await sql`
        INSERT INTO movimientos_caja (descripcion, monto, categoria, metodo_pago)
        VALUES (${'Transferencia interna'}, ${d.monto}, ${'ingreso'}, ${d.a})
      `
      const deLabel = d.de === 'efectivo' ? '💵 Efectivo' : '🏦 Banco'
      const aLabel = d.a === 'efectivo' ? '💵 Efectivo' : '🏦 Banco'
      await sendMessage(chatId, `🔄 <b>Transferencia interna registrada</b>\n💸 Sale de ${deLabel}: -$${d.monto.toLocaleString('es-UY')}\n💰 Entra a ${aLabel}: +$${d.monto.toLocaleString('es-UY')}`)
      return NextResponse.json({ ok: true })
    }

    // movimiento_caja siempre tiene ok:true pero lo chequeamos antes por si acaso
    if (resultado.tipo === 'movimiento_caja') {
      const d = resultado.data as MovimientoCajaData
      await sql`
        INSERT INTO movimientos_caja (descripcion, monto, categoria, metodo_pago, etiqueta)
        VALUES (${d.descripcion}, ${d.monto}, ${d.categoria}, ${d.metodoPago ?? null}, ${d.etiqueta ?? null})
      `
      const emoji = d.categoria === 'egreso' ? '💸' : '💰'
      const signo = d.categoria === 'egreso' ? '-' : '+'
      const metodoPagoTexto = d.metodoPago === 'efectivo' ? ' · 💵 Efectivo' : d.metodoPago === 'transferencia' ? ' · 🏦 Transferencia' : ''
      const etiquetaTexto = d.etiqueta ? ` · 🏷️ ${d.etiqueta}` : ''
      await sendMessage(chatId, `${emoji} <b>Movimiento registrado</b>\n📝 ${d.descripcion}\n💵 ${signo}$${d.monto.toLocaleString('es-UY')}${metodoPagoTexto}${etiquetaTexto}`)
      return NextResponse.json({ ok: true })
    }

    if (!resultado.ok) {
      await sendMessage(chatId, resultado.mensajeRespuesta ?? 'No pude entender el mensaje.')
      return NextResponse.json({ ok: true })
    }

    if (resultado.tipo === 'compra_stock') {
      const c = normalizarCompraStock(resultado.data as CompraStockData)

      const payloadStr = JSON.stringify(c)
      await sql`
        INSERT INTO telegram_estados (chat_id, estado, venta_id, payload, updated_at)
        VALUES (${chatId}, 'confirmando_compra_stock', null, ${payloadStr}, now())
        ON CONFLICT (chat_id) DO UPDATE SET estado = 'confirmando_compra_stock', venta_id = null, payload = ${payloadStr}, updated_at = now()
      `
      await sendMessageWithButtons(chatId,
        `📥 <b>Compra de stock</b>\n\n${bloqueCompraTexto(c)}\n\n¿Confirmar?`,
        [{ text: '✅ Confirmar', callback_data: 'confirmar_compra_stock' }, { text: '❌ Cancelar', callback_data: 'cancelar_compra_stock' }]
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

      const payloadStr = JSON.stringify({ compras })
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
        [{ text: '✅ Confirmar todo', callback_data: 'confirmar_compras_stock_multiples' }, { text: '❌ Cancelar', callback_data: 'cancelar_compra_stock' }]
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
      const clienteRows = await sql`SELECT id FROM clientes WHERE lower(nombre) LIKE lower(${'%' + d.clienteNombre + '%'}) LIMIT 1`
      if (!clienteRows.length) {
        await sendMessage(chatId, `❌ No encontré un cliente con el nombre "${d.clienteNombre}".`)
        return NextResponse.json({ ok: true })
      }
      const cId = clienteRows[0].id as string
      // Concatenar a data_extra existente
      await sql`
        UPDATE clientes SET data_extra = CASE
          WHEN data_extra IS NULL OR data_extra = '' THEN ${d.info}
          ELSE data_extra || E'\n' || ${d.info}
        END
        WHERE id = ${cId}
      `
      await sendMessage(chatId, `📝 <b>Data extra de ${d.clienteNombre} actualizada:</b>\n${d.info}`)
      return NextResponse.json({ ok: true })
    }

    if (resultado.tipo === 'ventas_multiples') {
      const ventas = resultado.ventas!
      // Resolver precios desde BD para cada producto
      const ventasResueltas = []
      for (const v of ventas) {
        let precio = v.precio
        if (!precio || v.usarPrecioBD) {
          const busqueda = await buscarProductoEnBD(v.producto)
          if (busqueda.exacto && busqueda.encontrados.length === 1) {
            precio = busqueda.encontrados[0].precio_venta
            v.producto = busqueda.encontrados[0].nombre
          }
        }
        ventasResueltas.push({ ...v, precio })
      }

      // Mostrar una sola confirmación con todos los productos
      let msg = `📦 <b>Ventas múltiples</b>\n👤 Cliente: ${ventas[0].clienteNombre}\n\n`
      ventasResueltas.forEach((v, i) => {
        msg += `<b>${i + 1}.</b> ${v.producto} — $${v.precio ?? '?'}\n`
      })
      msg += `\n💳 Pago: ${ventas[0].pagado ? '✅ Pagado' : '⏳ Pendiente'}\n\n¿Confirmar?`

      const pStr = JSON.stringify({ ventasMultiples: ventasResueltas, dataExtraInline })
      await sql`
        INSERT INTO telegram_estados (chat_id, estado, venta_id, payload, updated_at)
        VALUES (${chatId}, 'confirmando_ventas_multiples', null, ${pStr}, now())
        ON CONFLICT (chat_id) DO UPDATE SET estado = 'confirmando_ventas_multiples', venta_id = null, payload = ${pStr}, updated_at = now()
      `
      await sendMessageWithButtons(chatId, msg, [
        { text: '✅ Confirmar todo', callback_data: 'confirmar_ventas_multiples' },
        { text: '❌ Cancelar', callback_data: 'cancelar_venta' },
      ])
      return NextResponse.json({ ok: true })
    }

    if (resultado.tipo === 'editar_venta') {
      const d = resultado.data as EditarVentaData
      const clienteRows = await sql`SELECT id, nombre FROM clientes WHERE lower(nombre) LIKE lower(${'%' + d.clienteNombre + '%'}) ORDER BY activo DESC LIMIT 1`
      if (!clienteRows.length) {
        await sendMessage(chatId, `❌ No encontré un cliente con el nombre "${d.clienteNombre}".`)
        return NextResponse.json({ ok: true })
      }
      const cId = clienteRows[0].id as string
      const cNombre = clienteRows[0].nombre as string

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
      const clienteRows = await sql`SELECT id FROM clientes WHERE lower(nombre) LIKE lower(${'%' + d.clienteNombre + '%'}) LIMIT 1`
      if (!clienteRows.length) {
        await sendMessage(chatId, `❌ No encontré un cliente con el nombre "${d.clienteNombre}".`)
        return NextResponse.json({ ok: true })
      }
      const cId = clienteRows[0].id as string
      if (d.telefono)  await sql`UPDATE clientes SET telefono  = ${d.telefono}  WHERE id = ${cId}`
      if (d.direccion) await sql`UPDATE clientes SET direccion = ${d.direccion} WHERE id = ${cId}`
      let mensaje = `✅ Cliente <b>${d.clienteNombre}</b> actualizado:\n`
      if (d.telefono)  mensaje += `📱 Teléfono: ${d.telefono}\n`
      if (d.direccion) mensaje += `📍 Dirección: ${d.direccion}\n`
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

// ── procesarVentaConProducto ───────────────────────────────────────────────

async function procesarVentaConProducto(chatId: string, d: VentaData, dataExtraInline: string | null = null) {
  const clienteExistente = await buscarClienteSimilar(d.clienteNombre)
  let clienteId: string

  if (clienteExistente) {
    clienteId = clienteExistente.id
    // Usar el nombre canónico de la BD (así la confirmación muestra el cliente real)
    d.clienteNombre = clienteExistente.nombre
    if (!clienteExistente.activo) await sql`UPDATE clientes SET activo = true WHERE id = ${clienteId}`
    if (d.clienteDireccion) await sql`UPDATE clientes SET direccion = ${d.clienteDireccion} WHERE id = ${clienteId}`
    if (d.clienteTelefono)  await sql`UPDATE clientes SET telefono  = ${d.clienteTelefono}  WHERE id = ${clienteId}`
  } else {
    const nuevo = await sql`INSERT INTO clientes (nombre, telefono, direccion, activo) VALUES (${d.clienteNombre}, ${d.clienteTelefono ?? null}, ${d.clienteDireccion ?? null}, true) RETURNING id`
    clienteId = nuevo[0].id as string
  }

  // Buscar mascota: por nombre si lo dieron, o por especie si el cliente ya tiene una
  let mascotaRows: { id: string; nombre: string }[] = []
  if (d.mascotaNombre) {
    mascotaRows = await sql`SELECT id, nombre FROM perros WHERE cliente_id = ${clienteId} AND lower(nombre) = lower(${d.mascotaNombre}) LIMIT 1` as { id: string; nombre: string }[]
  } else {
    // Sin nombre: buscar por especie del cliente
    mascotaRows = await sql`SELECT id, nombre FROM perros WHERE cliente_id = ${clienteId} AND especie = ${d.especie} LIMIT 1` as { id: string; nombre: string }[]
  }

  let perroId: string

  if (mascotaRows.length) {
    perroId = mascotaRows[0].id as string
    // Si no tenían nombre, completar con el que encontramos en BD
    if (!d.mascotaNombre) d.mascotaNombre = mascotaRows[0].nombre as string
  } else {
    // No existe — crear con nombre genérico si no se dio uno
    const nombreMascota = d.mascotaNombre ?? (d.especie === 'perro' ? 'Perro' : 'Gato')
    const nueva = await sql`INSERT INTO perros (cliente_id, nombre, especie, tipo, peso_kg) VALUES (${clienteId}, ${nombreMascota}, ${d.especie}, ${d.tipoPerro ?? null}, ${d.pesoKg ?? null}) RETURNING id`
    perroId = nueva[0].id as string
    d.mascotaNombre = nombreMascota
  }

  let fechaFin: string | null = null
  let gramosDiariosUsados: number | null = null

  if (d.especie === 'perro') {
    const gramosDeTabla = await obtenerGramosDiariosDeTabla(d.tipoPerro, d.pesoKg)
    if (gramosDeTabla) {
      gramosDiariosUsados = gramosDeTabla
      fechaFin = calcularFechaFinPorGramosDia(fechaHoyUruguay(), d.tamañoBolsaKg, gramosDeTabla).toISOString().split('T')[0]
    } else if (d.gramosPorComida && d.vecesAlDia) {
      gramosDiariosUsados = d.gramosPorComida * d.vecesAlDia
      fechaFin = calcularFechaFinPerro(fechaHoyUruguay(), d.tamañoBolsaKg, d.gramosPorComida, d.vecesAlDia).toISOString().split('T')[0]
    }
  } else if (d.especie === 'gato' && d.intervaloDiasGato) {
    fechaFin = calcularFechaFinGato(fechaHoyUruguay(), d.intervaloDiasGato).toISOString().split('T')[0]
  }

  const casaNormalizada = d.casa ?? 'shangrila'
  const stockRows = await sql`SELECT stock_actual, stock_shangrila, stock_departamento FROM productos WHERE lower(nombre) = lower(${d.producto}) LIMIT 1`
  const stockCasa = stockRows.length ? (casaNormalizada === 'departamento' ? stockRows[0].stock_departamento as number : stockRows[0].stock_shangrila as number) : 0
  const casaLabel = casaNormalizada === 'departamento' ? '🏢 Departamento' : '🏠 Shangrila'
  const stockWarning = (stockRows.length && stockCasa < d.cantidad)
    ? `\n⚠️ Solo hay ${stockCasa} bolsa${stockCasa !== 1 ? 's' : ''} en ${casaLabel}`
    : ''

  const payload = {
    clienteId, perroId, producto: d.producto, tamañoBolsaKg: d.tamañoBolsaKg,
    precio: d.precio, cantidad: d.cantidad, pagado: d.pagado, metodoPago: d.metodoPago ?? null,
    gramosPorComida: d.gramosPorComida, vecesAlDia: d.vecesAlDia,
    gramosDiarios: gramosDiariosUsados, fechaFin,
    clienteNombre: d.clienteNombre, clienteTelefono: d.clienteTelefono,
    clienteDireccion: d.clienteDireccion, mascotaNombre: d.mascotaNombre,
    especie: d.especie, tipoPerro: d.tipoPerro, pesoKg: d.pesoKg,
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
  const pesoTexto     = d.pesoKg ? `, ${d.pesoKg}kg` : ''
  const direccionTexto = d.clienteDireccion ? `\n📍 Dirección: ${d.clienteDireccion}` : ''

  await sendMessageWithButtons(chatId,
    `📦 <b>Nueva venta</b>\n\n👤 Cliente: ${d.clienteNombre}${direccionTexto}\n🐾 Mascota: ${d.mascotaNombre} (${d.especie}${pesoTexto})\n🛍 Producto: ${d.producto}${cantidadTexto}\n💰 Precio: $${d.precio}${totalTexto}\n💳 Pago: ${pagoTexto}\n${casaLabel} Stock: baja de ${casaLabel}${stockWarning}\n\n¿Confirmar?`,
    [{ text: '✅ Confirmar', callback_data: 'confirmar_venta' }, { text: '❌ Cancelar', callback_data: 'cancelar_venta' }]
  )
}
