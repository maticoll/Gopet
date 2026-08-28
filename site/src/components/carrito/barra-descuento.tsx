'use client'

import { TRAMOS, TOPE_BARRA, type Totales } from '@/lib/carrito'
import { formatearPrecio } from '@/lib/catalogo'

/**
 * La "línea" de descuentos: se va llenando a medida que sumás al carrito y
 * marca los dos escalones ($6.000 → 10%, $10.000 → 20%).
 */
export function BarraDescuento({ totales }: { totales: Totales }) {
  const { porcentaje, falta, tramoSiguiente, progreso } = totales
  const alMaximo = tramoSiguiente === null

  return (
    <div className="rounded-2xl p-4" style={{ backgroundColor:'#FFF5EE', border:'1px solid #F0DCCB' }}>
      {/* Mensaje */}
      <p className="text-sm font-heading font-bold mb-3 leading-snug" style={{ color:'#3D2010' }}>
        {alMaximo ? (
          <>¡Máximo descuento! Te llevás <span style={{ color:'#25A244' }}>{porcentaje}% OFF</span> 🎉</>
        ) : (
          <>
            {porcentaje > 0 && (
              <span className="inline-block mr-1.5 px-2 py-0.5 rounded-full text-[10px] font-black align-middle text-white"
                    style={{ backgroundColor:'#25A244' }}>
                {porcentaje}% OFF
              </span>
            )}
            Te {falta === 1 ? 'falta' : 'faltan'}{' '}
            <span style={{ color:'#E87010' }}>{formatearPrecio(falta)}</span> para{' '}
            <span style={{ color:'#E87010' }}>{tramoSiguiente.porcentaje}% OFF</span>
          </>
        )}
      </p>

      {/* Riel */}
      <div className="relative h-2.5 rounded-full" style={{ backgroundColor:'#F0DCCB' }}>
        {/* El ancho va por CSS y no por framer-motion: así queda pintado desde el
            primer render, sin depender de que llegue a correr un frame. */}
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${progreso}%`,
            background: alMaximo ? '#25A244' : 'linear-gradient(90deg,#F5A800,#E87010)',
            transition: 'background 0.3s ease',
          }}
        />

        {/* Marcas de cada escalón */}
        {TRAMOS.map(tramo => {
          const izquierda = (tramo.minimo / TOPE_BARRA) * 100
          const alcanzado = porcentaje >= tramo.porcentaje
          return (
            <div key={tramo.minimo} className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                 style={{ left:`${izquierda}%` }}>
              <div className="w-4 h-4 rounded-full flex items-center justify-center transition-colors"
                   style={{
                     backgroundColor: alcanzado ? '#25A244' : '#FFFFFF',
                     border: `2px solid ${alcanzado ? '#25A244' : '#E0C8B0'}`,
                   }}>
                {alcanzado && (
                  <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" fill="none" stroke="#fff" strokeWidth="2.5"
                       strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M2.5 6.5l2.5 2.5 4.5-5"/>
                  </svg>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Etiquetas de los escalones */}
      <div className="relative h-8 mt-1.5">
        {TRAMOS.map(tramo => {
          const izquierda = (tramo.minimo / TOPE_BARRA) * 100
          const alcanzado = porcentaje >= tramo.porcentaje
          const ultimo = tramo.minimo === TOPE_BARRA
          return (
            <div
              key={tramo.minimo}
              className="absolute text-center leading-tight"
              style={{
                left: `${izquierda}%`,
                // El último marcador queda pegado al borde: se alinea a la derecha
                // para que la etiqueta no se corte.
                transform: ultimo ? 'translateX(-100%)' : 'translateX(-50%)',
              }}
            >
              <p className="text-[11px] font-black whitespace-nowrap"
                 style={{ color: alcanzado ? '#25A244' : '#C4804A' }}>
                {tramo.porcentaje}% OFF
              </p>
              <p className="text-[10px] whitespace-nowrap" style={{ color:'#C4804A' }}>
                {formatearPrecio(tramo.minimo)}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
