/**
 * Reparto del precio de una promo (varias bolsas vendidas juntas por un precio total).
 *
 * Criterio: el total va ENTERO en la bolsa más grande y las demás quedan en $0.
 * Las bolsas en $0 igual se registran como venta, así cada una descuenta su stock.
 */
export function repartirPrecioPromo<T extends { tamañoBolsaKg: number; precio: number | null }>(
  ventas: T[],
  precioTotal: number
): T[] {
  if (!ventas.length) return ventas

  let idxMasGrande = 0
  ventas.forEach((v, i) => {
    if ((v.tamañoBolsaKg ?? 0) > (ventas[idxMasGrande].tamañoBolsaKg ?? 0)) idxMasGrande = i
  })

  return ventas.map((v, i) => ({ ...v, precio: i === idxMasGrande ? precioTotal : 0 }))
}

/** Total facturado de un conjunto de ventas (precio × cantidad). */
export function totalVentas(ventas: { precio: number | null; cantidad?: number }[]): number {
  return ventas.reduce((acc, v) => acc + (v.precio ?? 0) * (v.cantidad ?? 1), 0)
}
