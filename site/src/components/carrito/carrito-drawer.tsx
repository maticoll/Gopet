'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react'
import { WaIcon } from '@/components/iconos'
import { waURL } from '@/lib/contacto'
import { formatearPrecio } from '@/lib/catalogo'
import { mensajeDePedido, TRAMOS } from '@/lib/carrito'
import { BarraDescuento } from './barra-descuento'
import type { Carrito } from './use-carrito'

export function CarritoDrawer({
  abierto,
  onCerrar,
  carrito,
}: {
  abierto: boolean
  onCerrar: () => void
  carrito: Carrito
}) {
  const { items, totales, cambiarCantidad, quitar, vaciar } = carrito

  // Cerrar con Escape y frenar el scroll del fondo mientras está abierto.
  useEffect(() => {
    if (!abierto) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar() }
    const overflowPrevio = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = overflowPrevio
      window.removeEventListener('keydown', onKey)
    }
  }, [abierto, onCerrar])

  const vacio = items.length === 0

  return (
    <AnimatePresence>
      {abierto && (
        <motion.div
          key="backdrop"
          initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
          className="fixed inset-0 z-[60] flex justify-end"
          style={{ backgroundColor:'rgba(0,0,0,0.55)', backdropFilter:'blur(4px)' }}
          onClick={onCerrar}
        >
          <motion.aside
            key="panel"
            role="dialog"
            aria-modal="true"
            aria-label="Tu carrito"
            initial={{ x:'100%' }} animate={{ x:0 }} exit={{ x:'100%' }}
            transition={{ type:'spring', damping:30, stiffness:300 }}
            className="relative w-full sm:max-w-md h-full flex flex-col shadow-2xl"
            style={{ backgroundColor:'#FFFBF6' }}
            onClick={e => e.stopPropagation()}
          >
            {/* ── Cabecera ── */}
            <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
                 style={{ borderBottom:'1px solid #F0DCCB', paddingTop:'max(1rem, env(safe-area-inset-top))' }}>
              <h2 className="font-heading font-black text-lg flex items-center gap-2" style={{ color:'#3D2010' }}>
                <ShoppingBag className="w-5 h-5" style={{ color:'#E87010' }}/>
                Tu carrito
                {totales.unidades > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor:'#E87010' }}>
                    {totales.unidades}
                  </span>
                )}
              </h2>
              <button onClick={onCerrar} aria-label="Cerrar carrito"
                      className="w-9 h-9 flex items-center justify-center rounded-full transition-colors cursor-pointer hover:brightness-95"
                      style={{ backgroundColor:'#FEE8D0', color:'#3D2010' }}>
                <X className="w-4 h-4"/>
              </button>
            </div>

            {vacio ? (
              /* ── Carrito vacío ── */
              <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-3">
                <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor:'#FFF5EE' }}>
                  <ShoppingBag className="w-9 h-9" style={{ color:'#E8C8A8' }}/>
                </div>
                <p className="font-heading font-black text-lg" style={{ color:'#3D2010' }}>Todavía no agregaste nada</p>
                <p className="text-sm leading-relaxed" style={{ color:'#9C7050' }}>
                  Sumá bolsas y mirá cómo baja el precio: desde {formatearPrecio(TRAMOS[0].minimo)} tenés {TRAMOS[0].porcentaje}% off.
                </p>
                <button onClick={onCerrar}
                        className="mt-2 px-6 py-3 rounded-2xl font-heading font-bold text-sm text-white cursor-pointer transition-all hover:brightness-110"
                        style={{ backgroundColor:'#E87010' }}>
                  Ver productos
                </button>
              </div>
            ) : (
              <>
                {/* ── Lista de items ── */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                  <div className="mb-4">
                    <BarraDescuento totales={totales}/>
                  </div>

                  <ul className="flex flex-col gap-3">
                    <AnimatePresence initial={false}>
                      {items.map(item => (
                        <motion.li
                          key={`${item.productoId}-${item.varianteIdx}`}
                          layout
                          initial={{ opacity:0, height:0 }}
                          animate={{ opacity:1, height:'auto' }}
                          exit={{ opacity:0, height:0, marginBottom:0 }}
                          transition={{ duration:0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="flex gap-3 p-3 rounded-2xl"
                               style={{ backgroundColor:'#FFFFFF', border:'1px solid #F0DCCB' }}>
                            {/* Miniatura */}
                            <div className="relative w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden"
                                 style={{ backgroundColor:'#FFF5EE' }}>
                              <Image src={item.producto.imagen} alt={`${item.producto.marca} ${item.producto.nombre}`}
                                     fill className="object-contain p-1.5" sizes="64px"/>
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-bold uppercase tracking-wider leading-none"
                                 style={{ color:item.producto.color }}>
                                {item.producto.marca}
                              </p>
                              <p className="font-heading font-bold text-sm leading-tight mt-0.5 truncate"
                                 style={{ color:'#3D2010' }}>
                                {item.producto.nombre}
                              </p>
                              <p className="text-xs mt-0.5" style={{ color:'#9C7050' }}>
                                {item.variante.etiqueta} · {formatearPrecio(item.variante.precio)} c/u
                              </p>

                              {/* Cantidad + importe */}
                              <div className="flex items-center justify-between mt-2 gap-2">
                                <div className="flex items-center gap-1 rounded-full p-0.5"
                                     style={{ backgroundColor:'#FEE8D0' }}>
                                  <button
                                    onClick={() => cambiarCantidad(item.productoId, item.varianteIdx, item.cantidad - 1)}
                                    aria-label={`Sacar uno de ${item.producto.nombre} ${item.variante.etiqueta}`}
                                    className="w-7 h-7 flex items-center justify-center rounded-full cursor-pointer transition-colors hover:bg-white"
                                    style={{ color:'#3D2010' }}>
                                    <Minus className="w-3.5 h-3.5"/>
                                  </button>
                                  <span className="w-6 text-center text-sm font-heading font-black tabular-nums"
                                        style={{ color:'#3D2010' }}>
                                    {item.cantidad}
                                  </span>
                                  <button
                                    onClick={() => cambiarCantidad(item.productoId, item.varianteIdx, item.cantidad + 1)}
                                    aria-label={`Agregar uno de ${item.producto.nombre} ${item.variante.etiqueta}`}
                                    className="w-7 h-7 flex items-center justify-center rounded-full cursor-pointer transition-colors hover:bg-white"
                                    style={{ color:'#3D2010' }}>
                                    <Plus className="w-3.5 h-3.5"/>
                                  </button>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <span className="font-heading font-black text-sm tabular-nums" style={{ color:'#3D2010' }}>
                                    {formatearPrecio(item.importe)}
                                  </span>
                                  <button
                                    onClick={() => quitar(item.productoId, item.varianteIdx)}
                                    aria-label={`Quitar ${item.producto.nombre} ${item.variante.etiqueta} del carrito`}
                                    className="w-7 h-7 flex items-center justify-center rounded-full cursor-pointer transition-colors hover:bg-red-50"
                                    style={{ color:'#C4804A' }}>
                                    <Trash2 className="w-3.5 h-3.5"/>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>

                  <button onClick={vaciar}
                          className="mt-4 text-xs font-bold underline underline-offset-2 cursor-pointer transition-colors hover:opacity-70"
                          style={{ color:'#C4804A' }}>
                    Vaciar carrito
                  </button>
                </div>

                {/* ── Totales + CTA ── */}
                <div className="flex-shrink-0 px-5 pt-4"
                     style={{
                       borderTop:'1px solid #F0DCCB',
                       backgroundColor:'#FFFBF6',
                       paddingBottom:'max(1rem, env(safe-area-inset-bottom))',
                     }}>
                  <div className="flex flex-col gap-1 mb-3">
                    <div className="flex items-center justify-between text-sm" style={{ color:'#9C7050' }}>
                      <span>Subtotal</span>
                      <span className="tabular-nums">{formatearPrecio(totales.subtotal)}</span>
                    </div>
                    {totales.descuento > 0 && (
                      <div className="flex items-center justify-between text-sm font-bold" style={{ color:'#25A244' }}>
                        <span>Descuento {totales.porcentaje}%</span>
                        <span className="tabular-nums">−{formatearPrecio(totales.descuento)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-heading font-black text-base" style={{ color:'#3D2010' }}>Total</span>
                      <span className="font-heading font-black text-2xl tabular-nums" style={{ color:'#3D2010' }}>
                        {formatearPrecio(totales.total)}
                      </span>
                    </div>
                  </div>

                  <a
                    href={waURL(mensajeDePedido(items, totales))}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl font-heading font-black text-base text-white transition-all hover:brightness-110 cursor-pointer"
                    style={{ backgroundColor:'#25D366', boxShadow:'0 8px 24px rgba(37,211,102,0.32)' }}
                  >
                    <WaIcon className="w-5 h-5"/> Enviar pedido por WhatsApp
                  </a>
                  <p className="text-[11px] text-center mt-2 mb-1" style={{ color:'#C4804A' }}>
                    Te abrimos el chat con el pedido escrito. Coordinás pago y entrega ahí mismo.
                  </p>
                </div>
              </>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
