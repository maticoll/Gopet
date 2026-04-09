import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const SYSTEM_PROMPT = `Sos un asistente que procesa mensajes sobre ventas y stock de alimento para mascotas (Uruguay).

Primero determiná el tipo de mensaje:
- "venta": se vendió comida a un cliente (menciona cliente y mascota)
- "compra_stock": llegó mercadería / se compró stock para revender (sin cliente específico)

Devolvé SOLO JSON válido, sin texto extra.

Para tipo "venta":
{
  "tipo": "venta",
  "ok": true/false,
  "data": {
    "clienteNombre": "string",
    "mascotaNombre": "string",
    "especie": "perro" | "gato",
    "tipoPerro": "adulto" | "senior" | "cachorro" | "raza_pequeña" | null,
    "pesoKg": number | null,
    "producto": "string normalizado del catálogo",
    "tamañoBolsaKg": number,
    "precio": number,
    "cantidad": number,
    "pagado": boolean,
    "gramosPorComida": number | null,
    "vecesAlDia": number | null,
    "intervaloDiasGato": number | null,
    "clienteDireccion": "string" | null,
    "clienteTelefono": "string" | null
  },
  "faltantes": ["campos que faltan"]
}

Para tipo "compra_stock":
{
  "tipo": "compra_stock",
  "ok": true,
  "data": {
    "producto": "string normalizado del catálogo",
    "cantidad": number,
    "precio": number | null
  }
}

Reglas para ventas:
- Campos requeridos: clienteNombre, mascotaNombre, especie, producto, tamañoBolsaKg, precio
- Campos requeridos para perros: gramosPorComida, vecesAlDia
- cantidad: número de bolsas vendidas (default 1 si no se menciona)
- pagado: true si dice "pagó" / "pagó transferencia" / "pagó efectivo" / "pagó con..."; false si dice "no pagó" / "debe" / "fiado" / no se menciona
- precio: precio unitario por bolsa (no total)

Normalización del nombre de producto — usar estos formatos exactos:
- Marca: Lager | Maxine | Connie | Wits | Toky
- Tipo: Adulto | Senior | Razas Pequeñas | Cachorro | Gato adulto | Gato castrado
- Tamaño: tal cual (22+3 kg, 21+4 kg, 10 kg, 7,5 kg, 8 kg, 25 kg, 21 kg, 22 kg)
- Ejemplo: "Lager Gato castrado 10 kg", "Maxine Adulto 21+4 kg"

Precios: "1800", "mil ochocientos", "$1.800" → número.
Bolsas: "15kg", "15 kilos" → número.`

export interface VentaData {
  clienteNombre: string
  mascotaNombre: string
  especie: 'perro' | 'gato'
  tipoPerro: string | null
  pesoKg: number | null
  producto: string
  tamañoBolsaKg: number
  precio: number
  cantidad: number
  pagado: boolean
  gramosPorComida: number | null
  vecesAlDia: number | null
  intervaloDiasGato: number | null
  clienteDireccion: string | null
  clienteTelefono: string | null
}

export interface CompraStockData {
  producto: string
  cantidad: number
  precio: number | null
}

export interface ParseResult {
  tipo: 'venta' | 'compra_stock'
  ok: boolean
  data?: VentaData | CompraStockData
  faltantes?: string[]
  mensajeRespuesta?: string
}

export async function parsearMensaje(mensaje: string): Promise<ParseResult> {
  const response = await client.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: mensaje }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  console.log('Claude raw response:', text)
  
  if (!text) {
    return { tipo: 'venta', ok: false, faltantes: [], mensajeRespuesta: 'No pude procesar el mensaje. Intentá de nuevo.' }
  }

  // Extract JSON from response (in case there's extra text)
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    console.error('Claude parser: no JSON found in response:', text)
    return { tipo: 'venta', ok: false, faltantes: [], mensajeRespuesta: 'No pude entender la respuesta. Intentá de nuevo.' }
  }

  let result: ParseResult
  try {
    result = JSON.parse(jsonMatch[0]) as ParseResult
  } catch {
    console.error('Claude parser: invalid JSON response:', text)
    return { tipo: 'venta', ok: false, faltantes: [], mensajeRespuesta: 'No pude entender la respuesta. Intentá de nuevo.' }
  }

  if (result.tipo === 'venta' && !result.ok && result.faltantes && result.faltantes.length > 0) {
    result.mensajeRespuesta = `Necesito los siguientes datos para registrar la venta:\n${result.faltantes.map(f => `• ${f}`).join('\n')}\n\nReenvía el mensaje con esa información.`
  }

  return result
}

// Backward-compat alias
export const parsearMensajeVenta = parsearMensaje
