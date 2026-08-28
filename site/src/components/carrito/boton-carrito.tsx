'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag } from 'lucide-react'
import { formatearPrecio } from '@/lib/catalogo'
import type { Totales } from '@/lib/carrito'

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
 * Barra flotante que aparece abajo cuando hay algo en el carrito. Es el atajo
 * principal en celular, donde el navbar se esconde al scrollear.
 */
export function BurbujaCarrito({ totales, onClick }: { totales: Totales; onClick: () => void }) {
  return (
    <AnimatePresence>
      {totales.unidades > 0 && (
        <motion.div
          initial={{ y:100, opacity:0 }} animate={{ y:0, opacity:1 }} exit={{ y:100, opacity:0 }}
          transition={{ type:'spring', damping:26, stiffness:280 }}
          className="fixed left-0 right-0 z-40 px-4 flex justify-center pointer-events-none"
          style={{ bottom:'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <button
            onClick={onClick}
            className="pointer-events-auto flex items-center gap-3 pl-4 pr-3 py-3 rounded-full cursor-pointer transition-all hover:brightness-110 w-full sm:w-auto max-w-md"
            style={{ backgroundColor:'#3D2010', boxShadow:'0 10px 32px rgba(61,32,16,0.4)' }}
          >
            <span className="relative flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0"
                  style={{ backgroundColor:'#E87010' }}>
              <ShoppingBag className="w-4 h-4 text-white"/>
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[10px] font-black tabular-nums"
                    style={{ backgroundColor:'#FFFFFF', color:'#3D2010' }}>
                {totales.unidades}
              </span>
            </span>

            <span className="flex flex-col items-start leading-tight flex-1 min-w-0">
              <span className="text-[11px] text-white/60">
                {totales.porcentaje > 0
                  ? `${totales.porcentaje}% OFF aplicado`
                  : `Te faltan ${formatearPrecio(totales.falta)} para ${totales.tramoSiguiente?.porcentaje}% OFF`}
              </span>
              <span className="font-heading font-black text-white text-base tabular-nums">
                {formatearPrecio(totales.total)}
              </span>
            </span>

            <span className="font-heading font-bold text-sm text-white/90 whitespace-nowrap pr-1">
              Ver pedido →
            </span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
