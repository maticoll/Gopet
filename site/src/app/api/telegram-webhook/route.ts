import { NextRequest, NextResponse } from 'next/server'
import { parsearMensaje, type VentaData, type CompraStockData, type ActualizarClienteData, type FaltanteProducto, type ParseResult } from '@/lib/claude-parser'
import { sendMessage, sendMessageWithButtons, answerCallbackQuery, deleteMessage, getFile, downloadFile, transcribeAudioWithClaude, getAuthorizedChatIds } from '@/lib/telegram'
import { appendVentaToSheet } from '@/lib/google-sheets'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { calcularFechaFinPerro, calcularFechaFinGato, calcularFechaFinPorGramosDia, fechaHoyUruguay, fechaHoyUruguayISO } from '@/lib/calculations'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Consulta la tabla_gramos para obtener los gramos diarios recomendados
 * según el tipo y peso del perro.
 * @returns promedio de gramos_min y gramos_max, o null si no encuentra
 */
async function obtenerGramosDiariosDeTabla(
  supabase: SupabaseClient,
  tipoPerro: string | null,
  pesoKg: number | null
): Promise<number | null> {
  if (!tipoPerro || !pesoKg) return null

  // Normalizar tipo para que coincida con la tabla
  // La tabla usa: adulto, senior, raza_pequeña, cachorro
  const tipoNormalizado = tipoPerro.toLowerCase()
    .replace('razas pequeñas', 'raza_pequeña')
    .replace('raza pequeña', 'raza_pequeña')
    .replace(/\s+/g, '_')

  const { data, error } = await supabase
    .from('tabla_gramos')
    .select('gramos_min, gramos_max')
    .eq('tipo_perro', tipoNormalizado)
    .lte('peso_min_kg', pesoKg)
    .gte('peso_max_kg', pesoKg)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Error consultando tabla_gramos:', error)
    return null
  }

  if (!data) {
    console.log(`No se encontró entrada en tabla_gramos para tipo=${tipoNormalizado}, peso=${pesoKg}`)
    return null
  }

  // Usar promedio de min y max
  const promedio = Math.round((data.gramos_min + data.gramos_max) / 2)
  console.log(`tabla_gramos: tipo=${tipoNormalizado}, peso=${pesoKg} -> ${promedio}g/día (min=${data.gramos_min}, max=${data.gramos_max})`)
  return promedio
}

/**
 * Busca un producto en la tabla productos y devuelve su precio_venta.
 * Intenta match exacto primero, luego búsqueda parcial.
 * @returns { producto, precio_venta, stock_actual } o null si no encuentra
 */
interface ProductoEncontrado {
  id: string
  nombre: string
  marca: string
  precio_venta: number
  stock_actual: number
}

async function buscarProductoEnBD(
  supabase: SupabaseClient,
  nombreProducto: string
): Promise<{ encontrados: ProductoEncontrado[], exacto: boolean }> {
  // Primero intenta match exacto (case insensitive)
  const { data: exacto } = await supabase
    .from('productos')
    .select('id, nombre, marca, precio_venta, stock_actual')
    .ilike('nombre', nombreProducto)
  
  if (exacto && exacto.length === 1) {
    return { encontrados: exacto as ProductoEncontrado[], exacto: true }
  }

  // Si no hay exacto o hay varios, buscar por partes del nombre
  // Extraer marca, tipo y tamaño del nombre
  const marcas = ['lager', 'maxine', 'connie', 'wits', 'toky']
  const tipos = ['adulto', 'senior', 'cachorro', 'razas pequeñas', 'gato adulto', 'gato castrado']
  
  let queryMarca: string | null = null
  let queryTipo: string | null = null
  let tamañoKg: number | null = null

  // Extraer tamaño (ej: "10 kg", "10kg", "22+3 kg")
  const matchTamaño = nombreProducto.match(/(\d+(?:\+\d+)?)\s*kg/i)
  if (matchTamaño) {
    // Para tamaños como "22+3", tomar el número principal
    const tamañoStr = matchTamaño[1].split('+')[0]
    tamañoKg = parseInt(tamañoStr, 10)
  }

  // Extraer marca
  for (const marca of marcas) {
    if (nombreProducto.toLowerCase().includes(marca)) {
      queryMarca = marca
      break
    }
  }
  
  // Buscar tipo (puede ser dos palabras: "razas pequeñas", "gato adulto")
  for (const tipo of tipos) {
    if (nombreProducto.toLowerCase().includes(tipo)) {
      queryTipo = tipo
      break
    }
  }

  // Construir búsqueda
  let query = supabase.from('productos').select('id, nombre, marca, precio_venta, stock_actual')
  
  if (queryMarca) {
    query = query.ilike('marca', `%${queryMarca}%`)
  }
  
  if (queryTipo) {
    query = query.ilike('nombre', `%${queryTipo}%`)
  }

  const { data: parciales } = await query.limit(20)
  
  // Filtrar por tamaño en JavaScript para mayor precisión
  let filtrados = (parciales || []) as ProductoEncontrado[]
  if (tamañoKg && filtrados.length > 0) {
    filtrados = filtrados.filter(p => {
      const matchProd = p.nombre.match(/(\d+(?:\+\d+)?)\s*kg/i)
      if (!matchProd) return false
      // Extraer el número principal del tamaño del producto
      const tamañoProd = parseInt(matchProd[1].split('+')[0], 10)
      return tamañoProd === tamañoKg
    })
  }
  
  return { encontrados: filtrados, exacto: filtrados.length === 1 }
}

/**
 * Busca productos que coincidan parcialmente con marca, tipo o tamaño
 */
async function buscarProductosPorCriterios(
  supabase: SupabaseClient,
  marca: string | null,
  tipoProducto: string | null,
  tamañoKg: number | null
): Promise<ProductoEncontrado[]> {
  let query = supabase.from('productos').select('id, nombre, marca, precio_venta, stock_actual')
  
  if (marca) {
    query = query.ilike('marca', `%${marca}%`)
  }
  
  if (tipoProducto) {
    query = query.ilike('nombre', `%${tipoProducto}%`)
  }

  const { data } = await query.order('marca').order('nombre').limit(50)
  
  // Filtrar por tamaño exacto en JavaScript para mayor precisión
  let filtrados = (data || []) as ProductoEncontrado[]
  if (tamañoKg && filtrados.length > 0) {
    filtrados = filtrados.filter(p => {
      const matchProd = p.nombre.match(/(\d+(?:\+\d+)?)\s*kg/i)
      if (!matchProd) return false
      // Extraer el número principal del tamaño del producto
      const tamañoProd = parseInt(matchProd[1].split('+')[0], 10)
      return tamañoProd === tamañoKg
    })
  }
  
  return filtrados
}

/**
 * Determina el siguiente campo opcional que falta para una venta.
 * Retorna null si no faltan más campos.
 */
function obtenerSiguienteCampoFaltante(d: VentaData, campoActual: string | null): string | null {
  const campos = ['telefono', 'direccion']
  const startIndex = campoActual ? campos.indexOf(campoActual) + 1 : 0
  
  for (let i = startIndex; i < campos.length; i++) {
    const campo = campos[i]
    if (campo === 'telefono' && !d.clienteTelefono) return 'telefono'
    if (campo === 'direccion' && !d.clienteDireccion) return 'direccion'
  }
  
  return null
}

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  const authorizedIds = getAuthorizedChatIds()

  // ── Handle inline button presses ─────────────────────────────────────────
  const callbackQuery = (body as any)?.callback_query
  if (callbackQuery) {
    const callbackQueryId = String(callbackQuery.id)
    const chatId = String(callbackQuery.message?.chat?.id)
    const messageId = callbackQuery.message?.message_id as number | undefined

    if (authorizedIds.length > 0 && !authorizedIds.includes(chatId)) {
      return NextResponse.json({ ok: true })
    }

    const data = String(callbackQuery.data ?? '')
    const [accion, ventaId] = data.split(':')

    await answerCallbackQuery(callbackQueryId)

    const supabase = getSupabase()

    // ── confirmar_venta ──────────────────────────────────────────────────
    if (accion === 'confirmar_venta') {
      // Eliminar el mensaje de confirmación con los botones
      if (messageId) {
        await deleteMessage(chatId, messageId)
      }

      const { data: estadoPendiente } = await supabase
        .from('telegram_estados')
        .select('payload')
        .eq('chat_id', chatId)
        .maybeSingle()

      if (!estadoPendiente?.payload) {
        await sendMessage(chatId, '⚠️ No hay venta pendiente de confirmación.')
        return NextResponse.json({ ok: true })
      }

      const p = estadoPendiente.payload as any

      const { data: ventaIdResult, error: rpcError } = await supabase.rpc('registrar_venta', {
        p_cliente_id:        p.clienteId,
        p_perro_id:          p.perroId,
        p_producto:          p.producto,
        p_tamaño_bolsa_kg:   p.tamañoBolsaKg,
        p_precio:            p.precio,
        p_gramos_por_comida: p.gramosPorComida ?? null,
        p_veces_al_dia:      p.vecesAlDia ?? null,
        p_fecha_estimada_fin: p.fechaFin ?? null,
        p_cantidad:          p.cantidad,
        p_pagado:            p.pagado,
      })

      await supabase.from('telegram_estados').delete().eq('chat_id', chatId)

      if (rpcError) {
        console.error('RPC registrar_venta error:', rpcError)
        await sendMessage(chatId, '❌ Error al registrar la venta. Revisá los logs.')
        return NextResponse.json({ ok: true })
      }

      // Google Sheets sync (non-blocking)
      try {
        await appendVentaToSheet({
          clienteNombre:    p.clienteNombre,
          clienteTelefono:  p.clienteTelefono,
          clienteDireccion: p.clienteDireccion,
          mascotaNombre:    p.mascotaNombre,
          especie:          p.especie,
          mascotaPeso:      p.pesoKg,
          producto:         p.producto,
          tamañoBolsaKg:    p.tamañoBolsaKg,
          precio:           p.precio,
          fechaVenta:       fechaHoyUruguayISO(),
          fechaEstimadaFin: p.fechaFin,
        })
      } catch (sheetsErr) {
        console.error('Sheets sync error (non-fatal):', sheetsErr)
      }

      // Check stock post-insert — warn if reached 0
      const { data: productoActualizado } = await supabase
        .from('productos')
        .select('stock_actual')
        .ilike('nombre', p.producto)
        .maybeSingle()

      if (productoActualizado && productoActualizado.stock_actual <= 0) {
        const chatIds = getAuthorizedChatIds()
        for (const id of chatIds) {
          await sendMessage(id, `⚠️ Stock de <b>${p.producto}</b> llegó a 0.`)
        }
      }

      const respuesta = p.fechaFin
        ? `✅ Venta registrada\n📅 Fin de bolsa estimado: ${new Date(p.fechaFin + 'T12:00:00').toLocaleDateString('es-UY')}\n⚠️ Alerta programada para 7 días antes`
        : `✅ Venta registrada\n(Sin fecha estimada)`
      await sendMessage(chatId, respuesta)

      // Enviar segundo mensaje con el detalle del cálculo
      if (p.fechaFin && p.especie === 'perro' && p.gramosDiarios) {
        const diasDuracion = Math.round((p.tamañoBolsaKg * 1000) / p.gramosDiarios)
        const calculo = `📊 <b>Cálculo:</b>\n` +
          `• Bolsa: ${p.tamañoBolsaKg} kg (${p.tamañoBolsaKg * 1000}g)\n` +
          `• Consumo: ${p.gramosDiarios}g/día${p.pesoKg ? ` (según peso ${p.pesoKg}kg)` : ''}\n` +
          `• Duración: ${diasDuracion} días`
        await sendMessage(chatId, calculo)
      } else if (p.fechaFin && p.especie === 'gato') {
        const hoy = fechaHoyUruguay()
        const fechaFinDate = new Date(p.fechaFin)
        const diasDuracion = Math.round((fechaFinDate.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
        const calculo = `📊 <b>Cálculo:</b>\n` +
          `• Intervalo de compra: ${diasDuracion} días (basado en historial)`
        await sendMessage(chatId, calculo)
      }

    // ── cancelar_venta ───────────────────────────────────────────────────
    } else if (accion === 'cancelar_venta') {
      // Eliminar el mensaje de confirmación con los botones
      if (messageId) {
        await deleteMessage(chatId, messageId)
      }
      await supabase.from('telegram_estados').delete().eq('chat_id', chatId)
      await sendMessage(chatId, '❌ Venta cancelada.')

    // ── confirmar_compra_stock ───────────────────────────────────────────
    } else if (accion === 'confirmar_compra_stock') {
      // Eliminar el mensaje de confirmación con los botones
      if (messageId) {
        await deleteMessage(chatId, messageId)
      }

      const { data: estadoPendiente } = await supabase
        .from('telegram_estados')
        .select('payload')
        .eq('chat_id', chatId)
        .maybeSingle()

      if (!estadoPendiente?.payload) {
        await sendMessage(chatId, '⚠️ No hay compra pendiente de confirmación.')
        return NextResponse.json({ ok: true })
      }

      const p = estadoPendiente.payload as any

      const { data: productoActual } = await supabase
        .from('productos')
        .select('id, stock_actual')
        .ilike('nombre', p.producto)
        .maybeSingle()

      await supabase.from('telegram_estados').delete().eq('chat_id', chatId)

      if (!productoActual) {
        await sendMessage(chatId, `⚠️ Producto "<b>${p.producto}</b>" no encontrado en el catálogo. Verificá el nombre.`)
        return NextResponse.json({ ok: true })
      }

      const nuevoStock = productoActual.stock_actual + p.cantidad
      await supabase
        .from('productos')
        .update({ stock_actual: nuevoStock })
        .eq('id', productoActual.id)

      await sendMessage(chatId, `✅ Stock actualizado.\n📦 <b>${p.producto}</b>: ${nuevoStock} bolsas en stock.`)

    // ── cancelar_compra_stock ────────────────────────────────────────────
    } else if (accion === 'cancelar_compra_stock') {
      // Eliminar el mensaje de confirmación con los botones
      if (messageId) {
        await deleteMessage(chatId, messageId)
      }
      await supabase.from('telegram_estados').delete().eq('chat_id', chatId)
      await sendMessage(chatId, '❌ Compra cancelada.')

    // ── recompro (from cron alert) ───────────────────────────────────────
    } else if (accion === 'recompro') {
      const { data: ventaOriginal } = await supabase
        .from('ventas')
        .select('*')
        .eq('id', ventaId)
        .single()

      if (!ventaOriginal) {
        await sendMessage(chatId, '⚠️ No encontré la venta original.')
        return NextResponse.json({ ok: true })
      }

      // Obtener datos de la mascota para consultar tabla_gramos
      const { data: mascota } = await supabase
        .from('perros')
        .select('tipo, peso_kg, intervalo_compra_dias, especie')
        .eq('id', ventaOriginal.perro_id)
        .single()

      let nuevaFechaFin: string | null = null
      
      if (mascota?.especie === 'perro' || (!mascota?.especie && !mascota?.intervalo_compra_dias)) {
        // Es perro: consultar tabla_gramos
        const gramosDeTabla = await obtenerGramosDiariosDeTabla(supabase, mascota?.tipo ?? null, mascota?.peso_kg ?? null)
        
        if (gramosDeTabla) {
          nuevaFechaFin = calcularFechaFinPorGramosDia(
            fechaHoyUruguay(),
            ventaOriginal.tamaño_bolsa_kg,
            gramosDeTabla
          ).toISOString().split('T')[0]
        } else if (ventaOriginal.gramos_por_comida && ventaOriginal.veces_al_dia) {
          // Fallback: usar los gramos guardados de la venta original
          nuevaFechaFin = calcularFechaFinPerro(
            fechaHoyUruguay(),
            ventaOriginal.tamaño_bolsa_kg,
            ventaOriginal.gramos_por_comida,
            ventaOriginal.veces_al_dia
          ).toISOString().split('T')[0]
        }
      } else if (mascota?.intervalo_compra_dias) {
        // Es gato: usar intervalo fijo
        nuevaFechaFin = calcularFechaFinGato(fechaHoyUruguay(), mascota.intervalo_compra_dias)
          .toISOString().split('T')[0]
      }

      await supabase.from('ventas').insert({
        cliente_id:         ventaOriginal.cliente_id,
        perro_id:           ventaOriginal.perro_id,
        producto:           ventaOriginal.producto,
        tamaño_bolsa_kg:    ventaOriginal.tamaño_bolsa_kg,
        precio:             ventaOriginal.precio,
        gramos_por_comida:  ventaOriginal.gramos_por_comida,
        veces_al_dia:       ventaOriginal.veces_al_dia,
        fecha_estimada_fin: nuevaFechaFin,
        cantidad:           1,
        pagado:             false,
        alerta_enviada:     false,
      })

      const msg = nuevaFechaFin
        ? `✅ Recompra registrada. Próxima alerta: ${new Date(nuevaFechaFin + 'T12:00:00').toLocaleDateString('es-UY')}`
        : `✅ Recompra registrada (sin fecha estimada).`
      await sendMessage(chatId, msg)

    // ── esperar (from cron alert) ────────────────────────────────────────
    } else if (accion === 'esperar') {
      await supabase.from('telegram_estados').upsert({
        chat_id:    chatId,
        estado:     'esperando_dias',
        venta_id:   ventaId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'chat_id' })
      await sendMessage(chatId, '¿Cuántos días querés que espere para volver a avisar? (respondé solo el número, ej: 7)')

    // ── baja (from cron alert) ───────────────────────────────────────────
    } else if (accion === 'baja') {
      const { data: venta } = await supabase
        .from('ventas')
        .select('cliente_id')
        .eq('id', ventaId)
        .single()
      if (venta) {
        await supabase.from('clientes').update({ activo: false }).eq('id', venta.cliente_id)
      }
      await sendMessage(chatId, '❌ Cliente dado de baja. No recibirá más alertas.')
    }

    return NextResponse.json({ ok: true })
  }

  // ── Handle regular text messages ─────────────────────────────────────────
  const message = (body as any)?.message
  if (!message?.chat?.id) return NextResponse.json({ ok: true })

  const chatId = String(message.chat.id)

  // Procesar mensaje de voz o audio
  let texto: string | null = null
  const voice = message.voice
  const audio = message.audio

  if (voice || audio) {
    const fileId = voice?.file_id || audio?.file_id
    if (!fileId) {
      await sendMessage(chatId, '❌ No se pudo procesar el audio.')
      return NextResponse.json({ ok: true })
    }

    // Verificar autorización antes de procesar audio (costoso)
    if (authorizedIds.length > 0 && !authorizedIds.includes(chatId)) {
      return NextResponse.json({ ok: true })
    }

    await sendMessage(chatId, '🎙️ Procesando audio...')

    const fileInfo = await getFile(fileId)
    if (!fileInfo) {
      await sendMessage(chatId, '❌ No se pudo obtener el archivo de audio.')
      return NextResponse.json({ ok: true })
    }

    const audioBuffer = await downloadFile(fileInfo.file_path)
    if (!audioBuffer) {
      await sendMessage(chatId, '❌ No se pudo descargar el audio.')
      return NextResponse.json({ ok: true })
    }

    const transcripcion = await transcribeAudioWithClaude(audioBuffer, fileInfo.file_path.split('/').pop() || 'audio.ogg')
    if (!transcripcion) {
      await sendMessage(chatId, '❌ No se pudo transcribir el audio.')
      return NextResponse.json({ ok: true })
    }

    texto = transcripcion.slice(0, 2000)
    // Mostrar la transcripción al usuario
    await sendMessage(chatId, `📝 <i>"${texto}"</i>`)
  } else if (message.text) {
    texto = String(message.text).slice(0, 2000)
  } else {
    // No es texto ni audio
    return NextResponse.json({ ok: true })
  }

  // /id command — available to anyone to get their chat ID
  if (texto.trim() === '/id') {
    await sendMessage(chatId, `Tu chat ID es: <code>${chatId}</code>`)
    return NextResponse.json({ ok: true })
  }

  if (authorizedIds.length > 0 && !authorizedIds.includes(chatId)) {
    return NextResponse.json({ ok: true })
  }

  const supabase = getSupabase()

  // ── "esperando_dias" state (user tapped Esperar) ─────────────────────────
  const { data: estadoActual } = await supabase
    .from('telegram_estados')
    .select('*')
    .eq('chat_id', chatId)
    .maybeSingle()

  if (estadoActual?.estado === 'esperando_dias') {
    const dias = parseInt(texto.trim(), 10)
    if (isNaN(dias) || dias < 1 || dias > 365) {
      await sendMessage(chatId, 'Por favor respondé con un número de días válido (ej: 7)')
      return NextResponse.json({ ok: true })
    }
    const nuevaFecha = fechaHoyUruguay()
    nuevaFecha.setDate(nuevaFecha.getDate() + dias)
    await supabase
      .from('ventas')
      .update({ fecha_estimada_fin: nuevaFecha.toISOString().split('T')[0], alerta_enviada: false })
      .eq('id', estadoActual.venta_id)
    await supabase.from('telegram_estados').delete().eq('chat_id', chatId)
    await sendMessage(chatId, `⏰ Listo, vuelvo a avisar en ${dias} días (${nuevaFecha.toLocaleDateString('es-UY')})`)
    return NextResponse.json({ ok: true })
  }

  // ── "esperando_seleccion_producto" state (user selecting product from list) ──
  if (estadoActual?.estado === 'esperando_seleccion_producto') {
    const seleccion = parseInt(texto.trim(), 10)
    const payload = estadoActual.payload as any
    const opcionesProducto = payload?.opcionesProducto as ProductoEncontrado[] | undefined
    
    if (!opcionesProducto || isNaN(seleccion) || seleccion < 1 || seleccion > opcionesProducto.length) {
      await sendMessage(chatId, `Por favor respondé con un número del 1 al ${opcionesProducto?.length || '?'}.`)
      return NextResponse.json({ ok: true })
    }

    const productoSeleccionado = opcionesProducto[seleccion - 1]
    
    // Extraer tamaño del nombre del producto (ej: "Lager Razas Pequeñas 10 kg" -> 10)
    const matchTamaño = productoSeleccionado.nombre.match(/(\d+(?:[,\.]\d+)?)\s*kg/i)
    const tamañoBolsaKg = matchTamaño ? parseFloat(matchTamaño[1].replace(',', '.')) : payload.tamañoBolsaKg || 10

    // Actualizar el payload con el producto seleccionado y continuar el flujo
    const ventaDataParcial = payload.ventaDataParcial as VentaData
    ventaDataParcial.producto = productoSeleccionado.nombre
    ventaDataParcial.precio = productoSeleccionado.precio_venta
    ventaDataParcial.tamañoBolsaKg = tamañoBolsaKg

    // Limpiar estado y continuar con el flujo de venta
    await supabase.from('telegram_estados').delete().eq('chat_id', chatId)
    
    // Re-procesar la venta con el producto seleccionado
    await procesarVentaConProducto(supabase, chatId, ventaDataParcial)
    return NextResponse.json({ ok: true })
  }

  // ── "esperando_datos_faltantes" state (user providing missing optional data) ──
  if (estadoActual?.estado === 'esperando_datos_faltantes') {
    const payload = estadoActual.payload as any
    const ventaDataParcial = payload.ventaDataParcial as VentaData
    const campoEsperado = payload.campoEsperado as string
    const respuesta = texto.trim()

    // Si dice "no", "sin datos", "dejalo así", etc., continuar sin el dato
    const saltarDato = /^(no|sin|nada|dejalo|dejalo asi|dejalo así|anotalo asi|anotalo así|skip|saltar|siguiente)$/i.test(respuesta)

    if (!saltarDato) {
      if (campoEsperado === 'telefono') {
        ventaDataParcial.clienteTelefono = respuesta
      } else if (campoEsperado === 'direccion') {
        ventaDataParcial.clienteDireccion = respuesta
      }
    }

    // Verificar si falta el siguiente campo
    const siguienteCampo = obtenerSiguienteCampoFaltante(ventaDataParcial, campoEsperado)
    
    if (siguienteCampo) {
      // Pedir el siguiente dato faltante
      await supabase.from('telegram_estados').update({
        payload: { ...payload, ventaDataParcial, campoEsperado: siguienteCampo },
        updated_at: new Date().toISOString(),
      }).eq('chat_id', chatId)

      const pregunta = siguienteCampo === 'telefono' 
        ? '📱 ¿Cuál es el teléfono del cliente? (o respondé "no" para saltar)'
        : '📍 ¿Cuál es la dirección del cliente? (o respondé "no" para saltar)'
      await sendMessage(chatId, pregunta)
      return NextResponse.json({ ok: true })
    }

    // Todos los datos completados, continuar con la venta
    await supabase.from('telegram_estados').delete().eq('chat_id', chatId)
    await procesarVentaConProducto(supabase, chatId, ventaDataParcial)
    return NextResponse.json({ ok: true })
  }

  // ── Parse message with Claude ─────────────────────────────────────────────
  try {
    const resultado = await parsearMensaje(texto)

    if (!resultado.ok) {
      await sendMessage(chatId, resultado.mensajeRespuesta ?? 'No pude entender el mensaje.')
      return NextResponse.json({ ok: true })
    }

    // ── COMPRA DE STOCK ───────────────────────────────────────────────────
    if (resultado.tipo === 'compra_stock') {
      const d = resultado.data as CompraStockData

      await supabase.from('telegram_estados').upsert({
        chat_id:    chatId,
        estado:     'confirmando_compra_stock',
        venta_id:   null,
        payload:    { producto: d.producto, cantidad: d.cantidad, precio: d.precio },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'chat_id' })

      const precioLinea = d.precio ? `\n💵 Precio compra: $${d.precio}/bolsa` : ''
      await sendMessageWithButtons(
        chatId,
        `📥 <b>Compra de stock</b>\n\n🛍 Producto: ${d.producto}\n📦 Cantidad: ${d.cantidad} bolsa${d.cantidad > 1 ? 's' : ''}${precioLinea}\n\n¿Confirmar?`,
        [
          { text: '✅ Confirmar', callback_data: 'confirmar_compra_stock' },
          { text: '❌ Cancelar',  callback_data: 'cancelar_compra_stock' },
        ]
      )
      return NextResponse.json({ ok: true })
    }

    // ── ACTUALIZAR CLIENTE ────────────────────────────────────────────────
    if (resultado.tipo === 'actualizar_cliente') {
      const d = resultado.data as ActualizarClienteData

      // Buscar el cliente
      const { data: cliente } = await supabase
        .from('clientes')
        .select('id, nombre, telefono, direccion')
        .ilike('nombre', `%${d.clienteNombre}%`)
        .maybeSingle()

      if (!cliente) {
        await sendMessage(chatId, `❌ No encontré un cliente con el nombre "${d.clienteNombre}".`)
        return NextResponse.json({ ok: true })
      }

      // Actualizar los datos
      const updates: { telefono?: string; direccion?: string } = {}
      if (d.telefono) updates.telefono = d.telefono
      if (d.direccion) updates.direccion = d.direccion

      if (Object.keys(updates).length === 0) {
        await sendMessage(chatId, '⚠️ No detecté qué dato actualizar. Decime el teléfono o la dirección.')
        return NextResponse.json({ ok: true })
      }

      await supabase.from('clientes').update(updates).eq('id', cliente.id)

      let mensaje = `✅ Cliente <b>${cliente.nombre}</b> actualizado:\n`
      if (d.telefono) mensaje += `📱 Teléfono: ${d.telefono}\n`
      if (d.direccion) mensaje += `📍 Dirección: ${d.direccion}\n`
      
      await sendMessage(chatId, mensaje)
      return NextResponse.json({ ok: true })
    }

    // ── VENTA ─────────────────────────────────────────────────────────────
    const d = resultado.data as VentaData
    const faltanteProducto = resultado.faltanteProducto

    // Si no hay precio o falta info del producto, buscar automáticamente en BD
    const necesitaBuscarEnBD = d.precio === null || d.usarPrecioBD || (faltanteProducto && (faltanteProducto.faltaMarca || faltanteProducto.faltaTamaño))
    
    if (necesitaBuscarEnBD) {
      // Buscar producto en la base de datos
      let productosEncontrados: ProductoEncontrado[] = []
      
      if (faltanteProducto && (faltanteProducto.faltaMarca || faltanteProducto.faltaTamaño)) {
        // Buscar con la información parcial que tenemos
        productosEncontrados = await buscarProductosPorCriterios(
          supabase,
          faltanteProducto.marcaMencionada,
          faltanteProducto.tipoProductoMencionado,
          faltanteProducto.tamañoMencionado
        )
      } else {
        // Buscar por nombre del producto
        const busqueda = await buscarProductoEnBD(supabase, d.producto)
        productosEncontrados = busqueda.encontrados
        
        // Si encontramos exactamente uno, usar ese precio
        if (busqueda.exacto && productosEncontrados.length === 1) {
          d.precio = productosEncontrados[0].precio_venta
          // Continuar con el flujo normal
          await procesarVentaConProducto(supabase, chatId, d)
          return NextResponse.json({ ok: true })
        }
      }

      // Si no encontramos productos, informar al usuario
      if (productosEncontrados.length === 0) {
        let mensajeFaltante = '❌ No encontré el producto en la base de datos.\n\n'
        if (faltanteProducto?.faltaMarca) {
          mensajeFaltante += '¿Cuál es la marca? (Lager, Maxine, Connie, Wits, Toky)\n'
        }
        if (faltanteProducto?.faltaTamaño) {
          mensajeFaltante += '¿De qué tamaño es la bolsa? (ej: 10 kg, 21 kg, 25 kg)\n'
        }
        mensajeFaltante += '\nReenviá el mensaje con la información completa.'
        await sendMessage(chatId, mensajeFaltante)
        return NextResponse.json({ ok: true })
      }

      // Si hay múltiples opciones, preguntar al usuario
      if (productosEncontrados.length > 1) {
        let mensaje = '🔍 Encontré varios productos. ¿Cuál es?\n\n'
        productosEncontrados.forEach((p, i) => {
          mensaje += `<b>${i + 1}.</b> ${p.nombre} — $${p.precio_venta}\n`
        })
        mensaje += '\nRespondé con el número del producto.'

        // Guardar estado para esperar la selección
        await supabase.from('telegram_estados').upsert({
          chat_id: chatId,
          estado: 'esperando_seleccion_producto',
          venta_id: null,
          payload: {
            opcionesProducto: productosEncontrados,
            ventaDataParcial: d,
          },
          updated_at: new Date().toISOString(),
        }, { onConflict: 'chat_id' })

        await sendMessage(chatId, mensaje)
        return NextResponse.json({ ok: true })
      }

      // Solo una opción encontrada, usar ese producto
      const productoUnico = productosEncontrados[0]
      d.producto = productoUnico.nombre
      d.precio = productoUnico.precio_venta
      
      // Extraer tamaño del nombre si no lo tenemos
      if (!d.tamañoBolsaKg) {
        const matchTamaño = productoUnico.nombre.match(/(\d+(?:[,\.]\d+)?)\s*kg/i)
        if (matchTamaño) {
          d.tamañoBolsaKg = parseFloat(matchTamaño[1].replace(',', '.'))
        }
      }
    }

    // Verificar que tenemos precio
    if (d.precio === null || d.precio === undefined) {
      await sendMessage(chatId, '❌ No encontré el producto en la base de datos. Indicá el precio o verificá el nombre del producto.')
      return NextResponse.json({ ok: true })
    }

    // Si no dijo "anotalo así" y faltan datos opcionales, preguntar
    if (!d.registrarSinPreguntar) {
      const primerCampoFaltante = obtenerSiguienteCampoFaltante(d, null)
      
      if (primerCampoFaltante) {
        // Guardar estado para preguntar datos faltantes
        await supabase.from('telegram_estados').upsert({
          chat_id: chatId,
          estado: 'esperando_datos_faltantes',
          venta_id: null,
          payload: {
            ventaDataParcial: d,
            campoEsperado: primerCampoFaltante,
          },
          updated_at: new Date().toISOString(),
        }, { onConflict: 'chat_id' })

        const pregunta = primerCampoFaltante === 'telefono'
          ? '📱 ¿Cuál es el teléfono del cliente? (o respondé "no" para saltar)'
          : '📍 ¿Cuál es la dirección del cliente? (o respondé "no" para saltar)'
        await sendMessage(chatId, pregunta)
        return NextResponse.json({ ok: true })
      }
    }

    await procesarVentaConProducto(supabase, chatId, d)

  } catch (err) {
    console.error('Webhook error:', err)
    await sendMessage(chatId, '❌ Ocurrió un error al procesar el mensaje. Revisá los logs.')
  }

  return NextResponse.json({ ok: true })
}

/**
 * Procesa una venta después de tener todos los datos completos (incluido el precio)
 */
async function procesarVentaConProducto(supabase: SupabaseClient, chatId: string, d: VentaData) {
  // Find or create client
  const { data: existente } = await supabase
    .from('clientes')
    .select('id, activo')
    .ilike('nombre', d.clienteNombre)
    .maybeSingle()

  let clienteId: string
  if (existente) {
    clienteId = existente.id
    // Actualizar dirección y teléfono si se proporcionaron, y reactivar si estaba dado de baja
    const updates: { activo?: boolean; direccion?: string; telefono?: string } = {}
    if (!existente.activo) updates.activo = true
    if (d.clienteDireccion) updates.direccion = d.clienteDireccion
    if (d.clienteTelefono) updates.telefono = d.clienteTelefono
    if (Object.keys(updates).length > 0) {
      await supabase.from('clientes').update(updates).eq('id', clienteId)
    }
  } else {
    const { data: nuevo, error } = await supabase
      .from('clientes')
      .insert({ nombre: d.clienteNombre, telefono: d.clienteTelefono, direccion: d.clienteDireccion, activo: true })
      .select('id')
      .single()
    if (error) throw error
    clienteId = nuevo.id
  }

  // Find or create pet
  const { data: mascotaExistente } = await supabase
    .from('perros')
    .select('id')
    .eq('cliente_id', clienteId)
    .ilike('nombre', d.mascotaNombre)
    .maybeSingle()

  let perroId: string
  if (mascotaExistente) {
    perroId = mascotaExistente.id
  } else {
    const { data: nuevaMascota, error } = await supabase
      .from('perros')
      .insert({ cliente_id: clienteId, nombre: d.mascotaNombre, especie: d.especie, tipo: d.tipoPerro, peso_kg: d.pesoKg })
      .select('id')
      .single()
    if (error) throw error
    perroId = nuevaMascota.id
  }

  // Calculate end date
  let fechaFin: string | null = null
  let gramosDiariosUsados: number | null = null
  
  if (d.especie === 'perro') {
    // Primero intentar obtener gramos de la tabla de referencia según peso y tipo
    const gramosDeTabla = await obtenerGramosDiariosDeTabla(supabase, d.tipoPerro, d.pesoKg)
    
    if (gramosDeTabla) {
      // Usar los gramos de la tabla de referencia (más precisos)
      gramosDiariosUsados = gramosDeTabla
      fechaFin = calcularFechaFinPorGramosDia(fechaHoyUruguay(), d.tamañoBolsaKg, gramosDeTabla)
        .toISOString().split('T')[0]
    } else if (d.gramosPorComida && d.vecesAlDia) {
      // Fallback: usar los gramos que dijo el usuario en el mensaje
      gramosDiariosUsados = d.gramosPorComida * d.vecesAlDia
      fechaFin = calcularFechaFinPerro(fechaHoyUruguay(), d.tamañoBolsaKg, d.gramosPorComida, d.vecesAlDia)
        .toISOString().split('T')[0]
    }
  } else if (d.especie === 'gato' && d.intervaloDiasGato) {
    fechaFin = calcularFechaFinGato(fechaHoyUruguay(), d.intervaloDiasGato)
      .toISOString().split('T')[0]
  }

  // Check stock before showing confirmation card
  const { data: productoEnCatalogo } = await supabase
    .from('productos')
    .select('stock_actual')
    .ilike('nombre', d.producto)
    .maybeSingle()

  const stockWarning = (productoEnCatalogo && productoEnCatalogo.stock_actual < d.cantidad)
    ? `\n⚠️ Solo hay ${productoEnCatalogo.stock_actual} bolsa${productoEnCatalogo.stock_actual !== 1 ? 's' : ''} en stock`
    : ''

  // Save to telegram_estados for confirmation
  const { error: upsertError } = await supabase.from('telegram_estados').upsert({
    chat_id:    chatId,
    estado:     'confirmando_venta',
    venta_id:   null,
    payload: {
      clienteId,
      perroId,
      producto:         d.producto,
      tamañoBolsaKg:    d.tamañoBolsaKg,
      precio:           d.precio,
      cantidad:         d.cantidad,
      pagado:           d.pagado,
      gramosPorComida:  d.gramosPorComida,
      vecesAlDia:       d.vecesAlDia,
      gramosDiarios:    gramosDiariosUsados,
      fechaFin,
      clienteNombre:    d.clienteNombre,
      clienteTelefono:  d.clienteTelefono,
      clienteDireccion: d.clienteDireccion,
      mascotaNombre:    d.mascotaNombre,
      especie:          d.especie,
      tipoPerro:        d.tipoPerro,
      pesoKg:           d.pesoKg,
    },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'chat_id' })

  if (upsertError) {
    console.error('Error saving telegram_estados:', upsertError)
    await sendMessage(chatId, `❌ Error al guardar estado: ${upsertError.message}`)
    return
  }

  const pagoTexto = d.pagado ? '✅ Pagado' : '⏳ Pendiente'
  const cantidadTexto = d.cantidad > 1 ? ` × ${d.cantidad}` : ''
  const totalTexto = d.cantidad > 1 ? ` (total: $${d.precio! * d.cantidad})` : ''
  const pesoTexto = d.pesoKg ? `, ${d.pesoKg}kg` : ''
  const direccionTexto = d.clienteDireccion ? `\n📍 Dirección: ${d.clienteDireccion}` : ''

  await sendMessageWithButtons(
    chatId,
    `📦 <b>Nueva venta</b>\n\n👤 Cliente: ${d.clienteNombre}${direccionTexto}\n🐾 Mascota: ${d.mascotaNombre} (${d.especie}${pesoTexto})\n🛍 Producto: ${d.producto}${cantidadTexto}\n💰 Precio: $${d.precio}${totalTexto}\n💳 Pago: ${pagoTexto}${stockWarning}\n\n¿Confirmar?`,
    [
      { text: '✅ Confirmar', callback_data: 'confirmar_venta' },
      { text: '❌ Cancelar',  callback_data: 'cancelar_venta' },
    ]
  )
}
