import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const SYSTEM_PROMPT = `Sos un asistente que procesa mensajes sobre ventas y stock de alimento para mascotas (Uruguay).

Primero determiná el tipo de mensaje:
- "venta": se vendió comida a un cliente (menciona cliente y mascota)
- "compra_stock": llegó mercadería / se compró stock para revender (sin cliente específico)
- "actualizar_cliente": actualizar datos de un cliente existente (teléfono, dirección)
- "movimiento_caja": gasto o ingreso de dinero por fuera de las ventas de bolsas. SIEMPRE elegir este tipo cuando el mensaje menciona "gasté", "pagué", "cobré", "entró plata", "salió plata", "flete", "nafta", "packaging", "insumo", o cualquier gasto/ingreso que NO sea venta de comida a un cliente con mascota. Ejemplos: "gasté mil en nafta", "pagué el flete $500", "gasté $200 en packaging", "entró $1000", "cobré deuda de X"
- "transferencia_interna": movimiento de plata entre métodos de pago (de efectivo al banco, o del banco a efectivo). Ejemplos: "pasé mil en efectivo al banco", "deposité $500 al banco", "saqué $2000 del banco en efectivo", "llevé plata al banco"
- "data_extra_cliente": anotar información extra de un cliente. El mensaje DEBE empezar con "data extra" seguido del nombre del cliente y la información. Ejemplo: "data extra Juan tiene alergia al pollo", "data extra María prefiere que la llamen a la tarde"

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
    "precio": number | null,
    "usarPrecioBD": boolean,
    "cantidad": number,
    "pagado": boolean,
    "metodoPago": "efectivo" | "transferencia" | null,
    "gramosPorComida": number | null,
    "vecesAlDia": number | null,
    "intervaloDiasGato": number | null,
    "clienteDireccion": "string" | null,
    "clienteTelefono": "string" | null,
    "registrarSinPreguntar": boolean
  },
  "faltantes": ["campos que faltan"],
  "faltanteProducto": {
    "faltaMarca": boolean,
    "faltaTamaño": boolean,
    "marcaMencionada": "string" | null,
    "tipoProductoMencionado": "string" | null,
    "tamañoMencionado": number | null
  }
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

Para tipo "actualizar_cliente":
{
  "tipo": "actualizar_cliente",
  "ok": true,
  "data": {
    "clienteNombre": "string",
    "telefono": "string" | null,
    "direccion": "string" | null
  }
}

Para tipo "transferencia_interna":
{
  "tipo": "transferencia_interna",
  "ok": true,
  "data": {
    "monto": number,
    "de": "efectivo" | "transferencia",
    "a": "efectivo" | "transferencia"
  }
}
- Usarlo cuando se mueve plata entre efectivo y banco/transferencia
- "pasé al banco", "deposité al banco" → de: "efectivo", a: "transferencia"
- "saqué del banco", "retiré del banco" → de: "transferencia", a: "efectivo"

Para tipo "data_extra_cliente":
{
  "tipo": "data_extra_cliente",
  "ok": true,
  "data": {
    "clienteNombre": "string",
    "info": "string (toda la información extra a anotar)"
  }
}
- Solo usar este tipo cuando el mensaje empieza con "data extra" (case insensitive)
- clienteNombre: el nombre del cliente mencionado justo después de "data extra"
- info: todo el texto restante después del nombre del cliente

Para tipo "movimiento_caja":
{
  "tipo": "movimiento_caja",
  "ok": true,
  "data": {
    "descripcion": "string",
    "monto": number,
    "categoria": "egreso" | "ingreso",
    "metodoPago": "efectivo" | "transferencia" | null,
    "etiqueta": "Meta Ads" | "Compra stock" | "Nafta" | null
  }
}
- categoria "egreso": se gastó plata (flete, packaging, insumos, gastos varios)
- categoria "ingreso": entró plata por fuera de ventas de bolsas (cobro de deuda, otro ingreso)
- etiqueta: asignar "Meta Ads" si el mensaje menciona "meta ads", "meta", "facebook ads", "instagram ads", "pauta", "publicidad"; asignar "Compra stock" si menciona "compra stock", "compré stock", "compré bolsas", "mercadería", "stock"; asignar "Nafta" si menciona "nafta", "combustible", "gasolina"; null si no aplica ninguna

Reglas para ventas:
- Campos requeridos (únicos): clienteNombre, especie, producto, tamañoBolsaKg
- especie: inferirla del producto si no se menciona explícitamente. "razas pequeñas", "adulto", "senior", "cachorro" en el nombre del producto → especie = "perro". "gato adulto", "gato castrado" → especie = "gato". NUNCA incluir "especie" en faltantes si se puede inferir del producto.
- mascotaNombre: poner null si el usuario no lo menciona explícitamente. NUNCA incluir "mascotaNombre" en faltantes — no es un campo obligatorio.
- precio: SIEMPRE poner null a menos que el usuario diga un número explícito. NUNCA incluir "precio" en faltantes — se busca automáticamente en la base de datos.
- usarPrecioBD: true siempre que precio sea null (es decir, casi siempre)
- pagado: true si dice "pagó" / "pagó transferencia" / "pagó efectivo" / "pagó con..."; false en CUALQUIER otro caso (si no se menciona = false). NUNCA incluir "pagado" en faltantes.
- metodoPago: "efectivo" si dice "efectivo" / "en mano" / "cash"; "transferencia" si dice "transferencia" / "transfer" / "banco" / "bizum" / "mercadopago"; null si no se menciona. NUNCA incluir "metodoPago" en faltantes.
- gramosPorComida y vecesAlDia: poner null si no se mencionan explícitamente. NUNCA incluir en faltantes — el sistema los calcula automáticamente desde la base de datos.
- clienteTelefono y clienteDireccion: extraerlos si el usuario los menciona, sino null. NUNCA incluirlos en faltantes.
- intervaloDiasGato: SIEMPRE null. NUNCA incluir "intervaloDiasGato" en faltantes — se calcula automáticamente en la segunda compra.
- cantidad: número de bolsas vendidas (default 1 si no se menciona)
- registrarSinPreguntar: true si el usuario dice "anotalo así" / "dejalo así" / "registralo así" / "guardalo así" / "así está bien" / "sin más datos" / "solo eso". False en caso contrario.

Reglas para actualizar_cliente:
- Detectar mensajes como "el teléfono de [cliente] es [número]" o "la dirección de [cliente] es [dirección]"
- También "agregale a [cliente] el teléfono [número]"

Información parcial del producto (faltanteProducto):
- Si el usuario menciona un producto pero falta información (marca o tamaño), incluí faltanteProducto
- faltaMarca: true si no se puede determinar la marca (Lager, Maxine, Connie, Wits, Toky)
- faltaTamaño: true si no se menciona el tamaño de la bolsa
- marcaMencionada: la marca si se mencionó, null si no
- tipoProductoMencionado: "Adulto" | "Senior" | "Razas Pequeñas" | "Cachorro" | "Gato adulto" | "Gato castrado" | null
- tamañoMencionado: el tamaño en kg si se mencionó, null si no
- IMPORTANTE: Si dice "Laguer", "Lager" (con o sin r), "lager" debe normalizarse a "Lager"

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
  precio: number | null
  usarPrecioBD: boolean
  cantidad: number
  pagado: boolean
  metodoPago: 'efectivo' | 'transferencia' | null
  gramosPorComida: number | null
  vecesAlDia: number | null
  intervaloDiasGato: number | null
  clienteDireccion: string | null
  clienteTelefono: string | null
  registrarSinPreguntar: boolean
}

export interface FaltanteProducto {
  faltaMarca: boolean
  faltaTamaño: boolean
  marcaMencionada: string | null
  tipoProductoMencionado: string | null
  tamañoMencionado: number | null
}

export interface CompraStockData {
  producto: string
  cantidad: number
  precio: number | null
}

export interface ActualizarClienteData {
  clienteNombre: string
  telefono: string | null
  direccion: string | null
}

export interface TransferenciaInternaData {
  monto: number
  de: 'efectivo' | 'transferencia'
  a: 'efectivo' | 'transferencia'
}

export interface MovimientoCajaData {
  descripcion: string
  monto: number
  categoria: 'egreso' | 'ingreso'
  metodoPago: 'efectivo' | 'transferencia' | null
  etiqueta: 'Meta Ads' | 'Compra stock' | 'Nafta' | null
}

export interface DataExtraClienteData {
  clienteNombre: string
  info: string
}

export interface ParseResult {
  tipo: 'venta' | 'compra_stock' | 'actualizar_cliente' | 'movimiento_caja' | 'transferencia_interna' | 'data_extra_cliente'
  ok: boolean
  data?: VentaData | CompraStockData | ActualizarClienteData | MovimientoCajaData | TransferenciaInternaData | DataExtraClienteData
  faltantes?: string[]
  faltanteProducto?: FaltanteProducto
  mensajeRespuesta?: string
}

export async function parsearMensaje(mensaje: string): Promise<ParseResult> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
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
