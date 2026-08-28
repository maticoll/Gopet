'use client'

import { useState } from 'react'
import { Plus, Minus } from 'lucide-react'
import { formatearPrecio, type Producto, type Variante } from '@/lib/catalogo'
import type { Carrito } from './use-carrito'

/**
 * Cómo se suma un producto al carrito.
 *
 * En la tarjeta del grid: un desplegable para el tamaño y, abajo, el precio de
 * ese tamaño con el botón al lado. Un solo control por tarjeta.
 *
 * En el detalle del producto se listan todos los tamaños con su precio, que ahí
 * lo que querés es comparar.
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
  const [elegida, setElegida] = useState(0)

  if (tamaño === 'grande') {
    return (
      <div className="flex flex-col gap-2">
        {producto.variantes.map((v, idx) => (
          <div key={v.etiqueta}
               className="flex items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5"
               style={{ backgroundColor:'#FFF5EE' }}>
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-sm font-semibold whitespace-nowrap" style={{ color:'#9C7050' }}>{v.etiqueta}</span>
                {v.gratis && <SelloGratis/>}
              </div>
              <span className="font-black text-lg tabular-nums" style={{ color:'#3D2010' }}>
                {formatearPrecio(v.precio)}
              </span>
            </div>
            <Control producto={producto} variante={v} varianteIdx={idx} carrito={carrito} grande/>
          </div>
        ))}
      </div>
    )
  }

  const variante = producto.variantes[elegida]

  return (
    <div className="flex flex-col gap-2.5">
      {/* Un bloque por tamaño: elegís uno y abajo aparece su precio */}
      {producto.variantes.length > 1 && (
        <div className="flex gap-1.5">
          {producto.variantes.map((v, idx) => {
            const activa = idx === elegida
            const enCarrito = carrito.cantidadDe(producto.id, idx)
            return (
              <button
                key={v.etiqueta}
                onClick={() => setElegida(idx)}
                aria-pressed={activa}
                aria-label={`Ver ${producto.marca} ${producto.nombre} ${v.etiqueta}`}
                className="flex-1 flex items-center justify-center gap-1 rounded-xl py-2 px-1 text-[10px] sm:text-xs font-bold cursor-pointer transition-all min-w-0"
                style={activa
                  ? { backgroundColor:'#FFF5EE', color:'#3D2010', boxShadow:'inset 0 0 0 1.5px #E87010' }
                  : { backgroundColor:'#FFFFFF', color:'#9C7050', boxShadow:'inset 0 0 0 1px #EADCCB' }}
              >
                <span className="whitespace-nowrap truncate">{v.etiqueta}</span>
                {enCarrito > 0 && (
                  <span className="w-3.5 h-3.5 flex items-center justify-center rounded-full text-[8px] font-black text-white tabular-nums flex-shrink-0"
                        style={{ backgroundColor:'#E87010' }}>
                    {enCarrito}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Precio del tamaño elegido + botón */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-heading font-black text-base sm:text-2xl tabular-nums leading-none" style={{ color:'#3D2010' }}>
          {formatearPrecio(variante.precio)}
        </span>
        <Control producto={producto} variante={variante} varianteIdx={elegida} carrito={carrito}/>
      </div>
    </div>
  )
}

function SelloGratis() {
  return (
    <span className="inline-flex items-center justify-center text-[7px] font-bold uppercase rounded-full leading-none flex-shrink-0"
          style={{ backgroundColor:'#E87010', color:'#fff', height:'11px', padding:'0 3px' }}>
      gratis
    </span>
  )
}

/** Botón sólido cuando no hay ninguno; contador cuando ya sumaste. */
function Control({
  producto, variante, varianteIdx, carrito, grande,
}: {
  producto: Producto
  variante: Variante
  varianteIdx: number
  carrito: Carrito
  grande?: boolean
}) {
  const cantidad = carrito.cantidadDe(producto.id, varianteIdx)
  const etiqueta = `${producto.marca} ${producto.nombre} ${variante.etiqueta}`

  if (cantidad === 0) {
    return (
      <button
        onClick={() => carrito.agregar(producto.id, varianteIdx)}
        aria-label={`Agregar ${etiqueta} al carrito`}
        className={`flex items-center justify-center rounded-full font-heading font-bold text-white cursor-pointer transition-all hover:brightness-110 flex-shrink-0 ${
          grande ? 'px-6 h-11 text-sm' : 'px-3.5 sm:px-5 h-9 sm:h-10 text-xs sm:text-sm'
        }`}
        style={{ backgroundColor:'#E87010' }}
      >
        Agregar
      </button>
    )
  }

  return (
    <div className={`flex items-center rounded-full flex-shrink-0 ${grande ? 'gap-1 p-1' : 'gap-0.5 p-0.5 sm:p-1'}`}
         style={{ backgroundColor:'#F6EDE4' }}>
      <button
        onClick={() => carrito.cambiarCantidad(producto.id, varianteIdx, cantidad - 1)}
        aria-label={cantidad === 1 ? `Quitar ${etiqueta} del carrito` : `Sacar uno de ${etiqueta}`}
        className={`flex items-center justify-center rounded-full cursor-pointer transition-colors hover:bg-white flex-shrink-0 ${grande ? 'w-9 h-9' : 'w-7 h-7 sm:w-8 sm:h-8'}`}
        style={{ color:'#3D2010' }}
      >
        <Minus className="w-3.5 h-3.5"/>
      </button>

      <span
        aria-live="polite"
        aria-label={`${cantidad} de ${etiqueta}`}
        className={`text-center font-heading font-black tabular-nums ${grande ? 'w-7 text-base' : 'w-5 text-sm'}`}
        style={{ color:'#3D2010' }}
      >
        {cantidad}
      </span>

      <button
        onClick={() => carrito.agregar(producto.id, varianteIdx)}
        aria-label={`Agregar uno más de ${etiqueta}`}
        className={`flex items-center justify-center rounded-full cursor-pointer transition-all text-white hover:brightness-110 flex-shrink-0 ${grande ? 'w-9 h-9' : 'w-7 h-7 sm:w-8 sm:h-8'}`}
        style={{ backgroundColor:'#E87010' }}
      >
        <Plus className="w-3.5 h-3.5"/>
      </button>
    </div>
  )
}
