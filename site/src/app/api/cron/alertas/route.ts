import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { sendMessage, sendMessageWithButtons, getAuthorizedChatIds } from '@/lib/telegram'
import { fechaHoyUruguay } from '@/lib/calculations'
import Anthropic from '@anthropic-ai/sdk'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const hoy = fechaHoyUruguay()
  const en7dias = fechaHoyUruguay()
  en7dias.setDate(hoy.getDate() + 7)

  const ventasPendientes = await sql`
    SELECT v.id, v.producto, v.fecha_estimada_fin,
           c.id   AS cliente_id, c.nombre AS cliente_nombre,
           p.nombre AS mascota_nombre, p.especie, p.peso_kg
    FROM ventas v
    JOIN clientes c ON c.id = v.cliente_id
    JOIN perros  p ON p.id = v.perro_id
    WHERE v.fecha_estimada_fin IS NOT NULL
      AND v.fecha_estimada_fin <= ${en7dias.toISOString().split('T')[0]}
      AND v.fecha_estimada_fin >= ${hoy.toISOString().split('T')[0]}
      AND v.alerta_enviada = false
  `

  if (!ventasPendientes.length) {
    return NextResponse.json({ procesadas: 0 })
  }

  const anthropic = new Anthropic()
  let procesadas = 0

  for (const venta of ventasPendientes) {
    const diasRestantes = Math.round(
      (new Date(venta.fecha_estimada_fin as string).getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
    )

    try {
      const aiResponse = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `Generá un mensaje corto y amigable (máximo 2 oraciones) para enviarle a ${venta.cliente_nombre} diciéndole que a su mascota ${venta.mascota_nombre} se le está por terminar la comida (${venta.producto}) en ${diasRestantes} días. Tono cercano, no formal. Solo el mensaje, sin saludos ni firma.`
        }]
      })

      const mensajeIA = aiResponse.content[0].type === 'text' ? aiResponse.content[0].text : ''

      const alertaTexto = `⚠️ <b>${venta.mascota_nombre}</b> (${venta.especie}, ${venta.peso_kg}kg) — ${venta.cliente_nombre}
📦 Bolsa <b>${venta.producto}</b> vence en <b>${diasRestantes} días</b> (${new Date((venta.fecha_estimada_fin as string) + 'T12:00:00').toLocaleDateString('es-UY')})

💬 Mensaje sugerido para el cliente:
"${mensajeIA}"`

      const chatIds = getAuthorizedChatIds()
      for (const chatId of chatIds) {
        await sendMessageWithButtons(
          chatId,
          alertaTexto + '\n\n<b>¿Qué pasó con este cliente?</b>',
          [
            { text: '✅ Recompró',      callback_data: `recompro:${venta.id}` },
            { text: '⏰ Esperar',        callback_data: `esperar:${venta.id}` },
            { text: '❌ No quiere más', callback_data: `baja:${venta.id}` },
          ]
        )
      }

      await sql`UPDATE ventas SET alerta_enviada = true WHERE id = ${venta.id as string}`
      procesadas++
    } catch (ventaErr) {
      console.error(`Error processing venta ${venta.id}:`, ventaErr)
    }
  }

  return NextResponse.json({ procesadas })
}
