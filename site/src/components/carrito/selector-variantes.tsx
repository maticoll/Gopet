'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, Check } from 'lucide-react'
import { formatearPrecio, type Producto } from '@/lib/catalogo'

/**
 * Lista los tamaños de un producto con su precio y un botón para sumarlo al
 * carrito. Se usa igual en la tarjeta del grid y en el detalle del producto.
 */
export function SelectorVariantes({
  producto,
  onAgregar,
  tamaño = 'chico',
}: {
  producto: Producto
  onAgregar: (varianteIdx: number) => void
  tamaño?: 'chico' | 'grande'
}) {
  // Índice de la variante que se acaba de agregar, para el ✓ de confirmación.
  const [recienAgregada, setRecienAgregada] = useState<number | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  function agregar(idx: number) {
    onAgregar(idx)
    setRecienAgregada(idx)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setRecienAgregada(null), 1200)
  }

  const grande = tamaño === 'grande'

  return (
    <div className={`flex flex-col ${grande ? 'gap-2' : 'gap-1.5'}`}>
      {producto.variantes.map((v, idx) => {
        const agregada = recienAgregada === idx
        return (
          <div
            key={v.etiqueta}
            className={`flex items-center justify-between gap-2 rounded-xl ${grande ? 'px-3.5 py-2.5' : 'px-2.5 py-1.5'}`}
            style={{ backgroundColor:'#FFF5EE', border:'1px solid #F0DCCB' }}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`font-semibold whitespace-nowrap ${grande ? 'text-sm' : 'text-xs'}`} style={{ color:'#9C7050' }}>
                {v.etiqueta}
              </span>
              {v.gratis && (
                <span className="inline-flex items-center justify-center text-[7px] font-bold uppercase rounded-full leading-none flex-shrink-0"
                      style={{ backgroundColor:'#E87010', color:'#fff', height:'11px', padding:'0 3px' }}>
                  gratis
                </span>
              )}
              <span className={`font-black whitespace-nowrap tabular-nums ${grande ? 'text-base' : 'text-xs'}`} style={{ color:'#3D2010' }}>
                {formatearPrecio(v.precio)}
              </span>
            </div>

            <button
              onClick={() => agregar(idx)}
              aria-label={`Agregar ${producto.marca} ${producto.nombre} ${v.etiqueta} al carrito`}
              className={`flex items-center justify-center gap-1 rounded-lg font-heading font-bold text-white cursor-pointer transition-all hover:brightness-110 flex-shrink-0 ${
                grande ? 'px-4 h-9 text-sm' : 'w-7 h-7'
              }`}
              style={{ backgroundColor: agregada ? '#25A244' : '#E87010' }}
            >
              {agregada
                ? <><Check className={grande ? 'w-4 h-4' : 'w-3.5 h-3.5'}/>{grande && 'Agregado'}</>
                : <><Plus className={grande ? 'w-4 h-4' : 'w-3.5 h-3.5'}/>{grande && 'Agregar'}</>}
            </button>
          </div>
        )
      })}
    </div>
  )
}
