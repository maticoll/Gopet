'use server'

import { sql } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function marcarPagado(ventaId: string): Promise<void> {
  await sql`UPDATE ventas SET pagado = true WHERE id = ${ventaId}`
  revalidatePath('/dashboard/caja')
}

export async function editarVenta(
  ventaId: string,
  data: {
    fecha_venta: string
    cliente_id: string
    producto: string
    precio: number
    cantidad: number
    pagado: boolean
    metodo_pago: string | null
  }
): Promise<void> {
  await sql`
    UPDATE ventas SET
      fecha_venta  = ${data.fecha_venta},
      cliente_id   = ${data.cliente_id},
      producto     = ${data.producto},
      precio       = ${data.precio},
      cantidad     = ${data.cantidad},
      pagado       = ${data.pagado},
      metodo_pago  = ${data.metodo_pago}
    WHERE id = ${ventaId}
  `
  revalidatePath('/dashboard/caja')
}

export async function marcarMovimientoPagado(movimientoId: string): Promise<void> {
  await sql`UPDATE movimientos_caja SET pagado = true WHERE id = ${movimientoId}`
  revalidatePath('/dashboard/caja')
}

export async function editarMovimiento(
  movimientoId: string,
  data: {
    descripcion: string
    monto: number
    categoria: string
    metodo_pago: string | null
    etiqueta: string | null
  }
): Promise<void> {
  await sql`
    UPDATE movimientos_caja SET
      descripcion = ${data.descripcion},
      monto       = ${data.monto},
      categoria   = ${data.categoria},
      metodo_pago = ${data.metodo_pago},
      etiqueta    = ${data.etiqueta}
    WHERE id = ${movimientoId}
  `
  revalidatePath('/dashboard/caja')
}

export async function eliminarMovimiento(movimientoId: string): Promise<void> {
  await sql`DELETE FROM movimientos_caja WHERE id = ${movimientoId}`
  revalidatePath('/dashboard/caja')
}

export async function eliminarVenta(ventaId: string): Promise<void> {
  // Devolver el stock a la casa correcta antes de borrar la venta
  await sql`SELECT devolver_stock_venta(${ventaId}::uuid)`
  await sql`DELETE FROM ventas WHERE id = ${ventaId}`
  revalidatePath('/dashboard/caja')
  revalidatePath('/dashboard/stock')
}

export async function editarStock(
  productoNombre: string,
  stockShangrila: number,
  stockDepartamento: number
): Promise<void> {
  await sql`
    UPDATE productos SET
      stock_shangrila    = ${stockShangrila},
      stock_departamento = ${stockDepartamento},
      stock_actual       = ${stockShangrila + stockDepartamento}
    WHERE nombre = ${productoNombre}
  `
  revalidatePath('/dashboard/caja')
}
