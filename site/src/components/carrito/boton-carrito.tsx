'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag } from 'lucide-react'
import { formatearPrecio } from '@/lib/catalogo'
import { TRAMOS, TOPE_BARRA, type Totales } from '@/lib/carrito'

/** Botón del navbar. Muestra la cantidad de bolsas como globito. */
export function BotonCarrito({
  totales,
  onClick,
  className = '',
}: {
  totales: Totales
  onClick: () => void
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      aria-label={`Abrir carrito (${totales.unidades} ${totales.unidades === 1 ? 'bolsa' : 'bolsas'})`}
      className={`relative flex items-center justify-center w-10 h-10 rounded-full cursor-pointer transition-colors hover:brightness-95 ${className}`}
      style={{ backgroundColor:'#FEE8D0', color:'#3D2010' }}
    >
      <ShoppingBag className="w-[18px] h-[18px]"/>
      <AnimatePresence>
        {totales.unidades > 0 && (
          <motion.span
            key="globito"
            initial={{ scale:0 }} animate={{ scale:1 }} exit={{ scale:0 }}
            transition={{ type:'spring', damping:16, stiffness:400 }}
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[10px] font-black text-white tabular-nums"
            style={{ backgroundColor:'#E87010' }}
          >
            {totales.unidades}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}

/**
 * Barra fija al pie, de lado a lado: total a la izquierda, en qué punto del
 * camino al descuento estás, y el botón para revisar el pedido. La línea de
 * progreso va pegada al borde inferior, cruzando toda la pantalla.
 *
 * Se muestra siempre, incluso con el carrito vacío, para que el descuento se
 * vea desde el arranque. La página compensa la altura con padding abajo, así
 * la barra nunca tapa el footer.
 */
export function BarraPedido({ totales, onClick }: { totales: Totales; onClick: () => void }) {
  const vacio = totales.unidades === 0
  const siguiente = totales.tramoSiguiente
  const alMaximo = siguiente === null
  const bolsas = `${totales.unidades} ${totales.unidades === 1 ? 'bolsa' : 'bolsas'}`

  const estado = vacio
    ? `Tu pedido está vacío · desde ${formatearPrecio(TRAMOS[0].minimo)} tenés ${TRAMOS[0].porcentaje}% OFF`
    : siguiente
      ? `${bolsas} · te faltan ${formatearPrecio(totales.falta)} para ${siguiente.porcentaje}% OFF`
      : `${bolsas} · ${totales.porcentaje}% OFF aplicado 🎉`

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40"
      style={{ backgroundColor:'#FFFFFF', borderTop:'1px solid #F0DCCB', boxShadow:'0 -4px 24px rgba(61,32,16,0.10)' }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-3 pb-2.5 flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="font-heading font-black text-xl sm:text-2xl tabular-nums flex-shrink-0" style={{ color:'#3D2010' }}>
            {formatearPrecio(totales.total)}
          </span>
          <span className="text-[11px] sm:text-sm leading-tight" style={{ color:'#9C7050' }}>
            {estado}
          </span>
        </div>

        <button
          onClick={onClick}
          disabled={vacio}
          className={`flex items-center gap-2 rounded-full font-heading font-black whitespace-nowrap flex-shrink-0 px-5 sm:px-7 py-3 text-sm sm:text-base transition-all ${
            vacio ? 'cursor-default' : 'cursor-pointer hover:brightness-110'
          }`}
          style={vacio
            ? { backgroundColor:'#FEE8D0', color:'#C4804A' }
            : { backgroundColor:'#E87010', color:'#fff', boxShadow:'0 6px 20px rgba(232,112,16,0.35)' }}
        >
          <ShoppingBag className="w-4 h-4"/> Ver mi pedido
        </button>
      </div>

      {/* El camino al descuento: metido adentro y redondeado, no pegado al borde */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6"
           style={{ paddingBottom:'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <div className="relative h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor:'#F5E4D0' }}>
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: `${totales.progreso}%`,
              background: alMaximo ? '#25A244' : 'linear-gradient(90deg,#F5A800,#E87010)',
            }}
          />
          {TRAMOS.map(tramo => (
            <span key={tramo.minimo}
                  className="absolute top-0 bottom-0 w-px"
                  style={{
                    left: `${(tramo.minimo / TOPE_BARRA) * 100}%`,
                    backgroundColor: 'rgba(61,32,16,0.22)',
                  }}/>
          ))}
        </div>
      </div>
    </div>
  )
}
