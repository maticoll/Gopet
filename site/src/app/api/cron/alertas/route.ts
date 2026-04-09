import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendMessage, sendMessageWithButtons, getAuthorizedChatIds } from '@/lib/telegram'
import { fechaHoyUruguay } from '@/lib/calculations'
import Anthropic from '@anthropic-ai/sdk'

export async function GET(req: NextRequest) {
  // Verify cron authorization
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const hoy = fechaHoyUruguay()
  const en7dias = fechaHoyUruguay()
  en7dias.setDate(hoy.getDate() + 7)

  // Ventas with pending alert and fecha_estimada_fin within next 7 days
  const { data: ventasPendientes, error } = await supabase
    .from('ventas')
    .select(`
      id, producto, fecha_estimada_fin,
      clientes(id, nombre),
      perros(nombre, especie, peso_kg)
    `)
    .not('fecha_estimada_fin', 'is', null)
    .lte('fecha_estimada_fin', en7dias.toISOString().split('T')[0])
    .gte('fecha_estimada_fin', hoy.toISOString().split('T')[0])
    .eq('alerta_enviada', false)

  if (error) {
    console.error('Cron query error:', error)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  if (!ventasPendientes?.length) {
    return NextResponse.json({ procesadas: 0 })
  }

  const anthropic = new Anthropic()
  let procesadas = 0

  for (const venta of ventasPendientes) {
    const cliente = (venta.clientes as any)
    const mascota = (venta.perros as any)
    const diasRestantes = Math.round(
      (new Date(venta.fecha_estimada_fin!).getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
    )

    try {
      // Generate personalized message with Claude
      const aiResponse = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `Generá un mensaje corto y amigable (máximo 2 oraciones) para enviarle a ${cliente?.nombre} diciéndole que a su mascota ${mascota?.nombre} se le está por terminar la comida (${venta.producto}) en ${diasRestantes} días. Tono cercano, no formal. Solo el mensaje, sin saludos ni firma.`
        }]
      })

      const mensajeIA = aiResponse.content[0].type === 'text' ? aiResponse.content[0].text : ''

      const alertaTexto = `⚠️ <b>${mascota?.nombre}</b> (${mascota?.especie}, ${mascota?.peso_kg}kg) — ${cliente?.nombre}
📦 Bolsa <b>${venta.producto}</b> vence en <b>${diasRestantes} días</b> (${new Date(venta.fecha_estimada_fin! + 'T12:00:00').toLocaleDateString('es-UY')})

💬 Mensaje sugerido para el cliente:
"${mensajeIA}"`

      const chatIds = getAuthorizedChatIds()
      for (const chatId of chatIds) {
        await sendMessageWithButtons(
          chatId,
          alertaTexto + '\n\n<b>¿Qué pasó con este cliente?</b>',
          [
            { text: '✅ Recompró', callback_data: `recompro:${venta.id}` },
            { text: '⏰ Esperar', callback_data: `esperar:${venta.id}` },
            { text: '❌ No quiere más', callback_data: `baja:${venta.id}` },
          ]
        )
      }

      await supabase
        .from('ventas')
        .update({ alerta_enviada: true })
        .eq('id', venta.id)

      procesadas++
    } catch (ventaErr) {
      console.error(`Error processing venta ${venta.id}:`, ventaErr)
      // Continue with next sale even if one fails
    }
  }

  return NextResponse.json({ procesadas })
}
