// ──────────────────────────────────────────────────────────────────────────────
// Carrito de la web pública: descuentos por monto y armado del pedido.
//
// La regla del descuento es por escalones sobre el subtotal (precio de lista):
//   $6.000 o más → 10% off
// Hoy hay un solo escalón y es el tope: el máximo que se hace es 10%.
// El cálculo igual recorre la lista, así sumar otro escalón es tocar TRAMOS.
// ──────────────────────────────────────────────────────────────────────────────

import { buscarProducto, formatearPrecio, type Producto, type Variante } from './catalogo'

export type Tramo = { minimo: number; porcentaje: number }

/** Ordenados de menor a mayor. La UI recorre esta lista para dibujar la barra. */
export const TRAMOS: Tramo[] = [
  { minimo: 6000, porcentaje: 10 },
]

export const TOPE_BARRA = TRAMOS[TRAMOS.length - 1].minimo

/** Lo que se guarda en el estado y en localStorage. */
export type ItemCarrito = {
  productoId: string
  varianteIdx: number
  cantidad: number
}

/** Un item ya resuelto contra el catálogo, listo para mostrar. */
export type ItemResuelto = ItemCarrito & {
  producto: Producto
  variante: Variante
  /** precio de lista × cantidad */
  importe: number
}

export type Totales = {
  subtotal: number
  porcentaje: number
  descuento: number
  total: number
  /** Escalón alcanzado, o null si todavía no llegó a ninguno. */
  tramoActual: Tramo | null
  /** Próximo escalón a alcanzar, o null si ya está en el máximo. */
  tramoSiguiente: Tramo | null
  /** Cuánto falta en pesos para el próximo escalón. 0 si ya está en el máximo. */
  falta: number
  /** 0 a 100 — qué tan lejos está del escalón máximo, para la barra de progreso. */
  progreso: number
  unidades: number
}

export function claveItem(productoId: string, varianteIdx: number): string {
  return `${productoId}::${varianteIdx}`
}

/**
 * Cruza los items guardados con el catálogo. Descarta en silencio lo que ya no
 * exista (producto dado de baja o variante que cambió), así un carrito viejo
 * guardado en localStorage nunca rompe la página.
 */
export function resolverItems(items: ItemCarrito[]): ItemResuelto[] {
  const resueltos: ItemResuelto[] = []
  for (const item of items) {
    const producto = buscarProducto(item.productoId)
    const variante = producto?.variantes[item.varianteIdx]
    if (!producto || !variante) continue
    if (!Number.isFinite(item.cantidad) || item.cantidad <= 0) continue
    resueltos.push({ ...item, producto, variante, importe: variante.precio * item.cantidad })
  }
  return resueltos
}

export function calcularTotales(items: ItemResuelto[]): Totales {
  const subtotal = items.reduce((acc, i) => acc + i.importe, 0)
  const unidades = items.reduce((acc, i) => acc + i.cantidad, 0)

  // El escalón más alto que el subtotal alcanza.
  const tramoActual = TRAMOS.filter(t => subtotal >= t.minimo).pop() ?? null
  const tramoSiguiente = TRAMOS.find(t => subtotal < t.minimo) ?? null

  const porcentaje = tramoActual?.porcentaje ?? 0
  const descuento = Math.round((subtotal * porcentaje) / 100)

  return {
    subtotal,
    porcentaje,
    descuento,
    total: subtotal - descuento,
    tramoActual,
    tramoSiguiente,
    falta: tramoSiguiente ? tramoSiguiente.minimo - subtotal : 0,
    progreso: Math.min(100, (subtotal / TOPE_BARRA) * 100),
    unidades,
  }
}

/**
 * Arma el texto del pedido que se manda por WhatsApp. Va con el detalle línea
 * por línea para que del otro lado se pueda cargar la venta sin volver a
 * preguntar nada.
 */
export function mensajeDePedido(items: ItemResuelto[], totales: Totales): string {
  const lineas = items.map(i =>
    `• ${i.cantidad}× ${i.producto.marca} ${i.producto.nombre} ${i.variante.etiqueta} — ${formatearPrecio(i.importe)}`
  )

  const partes = [
    '¡Hola GoPet! Quiero hacer este pedido:',
    '',
    ...lineas,
    '',
    `Subtotal: ${formatearPrecio(totales.subtotal)}`,
  ]

  if (totales.descuento > 0) {
    partes.push(`Descuento ${totales.porcentaje}%: -${formatearPrecio(totales.descuento)}`)
  }

  partes.push(`Total: ${formatearPrecio(totales.total)}`)
  return partes.join('\n')
}
