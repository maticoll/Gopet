'use client'

import { Plus, Minus } from 'lucide-react'
import { formatearPrecio, type Producto, type Variante } from '@/lib/catalogo'
import type { Carrito } from './use-carrito'

/**
 * Lista los tamaños de un producto con su precio y el contador para sumarlos al
 * carrito. Mientras no hay ninguno se ve un "Agregar" suave; apenas sumás uno se
 * convierte en "− 1 +" y la cantidad se maneja ahí mismo, sin abrir el carrito.
 *
 * En la tarjeta del grid el contador va en su propia línea y ocupa todo el ancho
 * (la tarjeta mide ~164px en celular y no entra al lado del precio). En el
 * detalle del producto, donde sobra lugar, va todo en una sola línea.
 */
export function SelectorVariantes({
  producto,
  carrito,
  tamaño = 'chico',
}: {
  producto: Producto
  carrito: Carrito
  tamaño?: 'chico' | 'grande'
}) {
  const grande = tamaño === 'grande'

  return (
    <div className={`flex flex-col ${grande ? 'gap-2' : 'gap-1.5'}`}>
      {producto.variantes.map((v, idx) => (
        <FilaVariante
          key={v.etiqueta}
          producto={producto}
          variante={v}
          varianteIdx={idx}
          carrito={carrito}
          grande={grande}
        />
      ))}
    </div>
  )
}

function FilaVariante({
  producto, variante, varianteIdx, carrito, grande,
}: {
  producto: Producto
  variante: Variante
  varianteIdx: number
  carrito: Carrito
  grande: boolean
}) {
  const cantidad = carrito.cantidadDe(producto.id, varianteIdx)
  const etiqueta = `${producto.marca} ${producto.nombre} ${variante.etiqueta}`

  const tamañoYBadge = (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className={`font-semibold whitespace-nowrap ${grande ? 'text-sm' : 'text-[11px]'}`} style={{ color:'#9C7050' }}>
        {variante.etiqueta}
      </span>
      {variante.gratis && (
        <span className="inline-flex items-center justify-center text-[7px] font-bold uppercase rounded-full leading-none flex-shrink-0"
              style={{ backgroundColor:'#E87010', color:'#fff', height:'11px', padding:'0 3px' }}>
          gratis
        </span>
      )}
    </div>
  )

  const precio = (
    <span className={`font-black whitespace-nowrap tabular-nums ${grande ? 'text-lg' : 'text-xs'}`} style={{ color:'#3D2010' }}>
      {formatearPrecio(variante.precio)}
    </span>
  )

  const control = cantidad === 0 ? (
    <button
      onClick={() => carrito.agregar(producto.id, varianteIdx)}
      aria-label={`Agregar ${etiqueta} al carrito`}
      className={`flex items-center justify-center gap-1 rounded-lg font-heading font-bold cursor-pointer transition-all hover:brightness-95 ${
        grande ? 'px-4 h-9 text-sm text-white' : 'w-full h-8 text-xs'
      }`}
      style={grande
        ? { backgroundColor:'#E87010' }
        : { backgroundColor:'#FEE8D0', color:'#E87010', border:'1px solid #F5D0A8' }}
    >
      <Plus className="w-3.5 h-3.5"/> Agregar
    </button>
  ) : (
    <div className={`flex items-center rounded-lg ${grande ? 'gap-1 p-1' : 'w-full justify-between p-0.5'}`}
         style={{ backgroundColor:'#FEE8D0' }}>
      <button
        onClick={() => carrito.cambiarCantidad(producto.id, varianteIdx, cantidad - 1)}
        aria-label={cantidad === 1 ? `Quitar ${etiqueta} del carrito` : `Sacar uno de ${etiqueta}`}
        className={`flex items-center justify-center rounded-md cursor-pointer transition-colors hover:bg-white flex-shrink-0 ${grande ? 'w-8 h-8' : 'w-7 h-7'}`}
        style={{ color:'#3D2010' }}
      >
        <Minus className="w-3.5 h-3.5"/>
      </button>

      <span
        aria-live="polite"
        aria-label={`${cantidad} de ${etiqueta}`}
        className={`text-center font-heading font-black tabular-nums ${grande ? 'w-7 text-base' : 'text-sm'}`}
        style={{ color:'#3D2010' }}
      >
        {cantidad}
      </span>

      <button
        onClick={() => carrito.agregar(producto.id, varianteIdx)}
        aria-label={`Agregar uno más de ${etiqueta}`}
        className={`flex items-center justify-center rounded-md cursor-pointer transition-colors text-white hover:brightness-110 flex-shrink-0 ${grande ? 'w-8 h-8' : 'w-7 h-7'}`}
        style={{ backgroundColor:'#E87010' }}
      >
        <Plus className="w-3.5 h-3.5"/>
      </button>
    </div>
  )

  // Detalle del producto: todo en una línea, que hay lugar de sobra.
  if (grande) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5"
           style={{ backgroundColor:'#FFF5EE', border:'1px solid #F0DCCB' }}>
        <div className="flex items-center gap-3 min-w-0">
          {tamañoYBadge}
          {precio}
        </div>
        {control}
      </div>
    )
  }

  // Tarjeta del grid: tamaño y precio arriba, contador a lo ancho abajo.
  return (
    <div className="rounded-xl px-2 py-2" style={{ backgroundColor:'#FFF5EE', border:'1px solid #F0DCCB' }}>
      <div className="flex items-center justify-between gap-1 mb-1.5">
        {tamañoYBadge}
        {precio}
      </div>
      {control}
    </div>
  )
}
