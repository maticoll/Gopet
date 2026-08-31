'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { WaIcon } from '@/components/iconos'
import { waURL } from '@/lib/contacto'
import { buscarProducto, descuento, formatearPrecio, promoLagerAdulto, type Variante } from '@/lib/catalogo'
import { BotonAgregarBolsa } from '@/components/carrito/selector-variantes'
import type { Carrito } from '@/components/carrito/use-carrito'

// ──────────────────────────────────────────────────────────────────────────────
// Las promos de la landing, una atrás de la otra. Pasan solas cada 8 segundos y
// se pueden arrastrar con el dedo, mover con las flechas o saltar con los
// puntitos. Cada promo tiene su propia foto y su paleta, y las dos se suman al
// pedido: el combo de Lager entra al carrito como un producto más (vive en
// `combos`, dentro de catalogo.ts, con el precio de promo ya puesto) y en la de
// Razas Pequeñas elegís el tamaño de bolsa, que se suma como cualquier otra ya
// con su 8% off.
// ──────────────────────────────────────────────────────────────────────────────

/** Cuánto queda cada promo en pantalla antes de pasar sola. */
const PAUSA_MS = 8000

/** Arrastre mínimo (px, sumando velocidad) para que cuente como pasar de promo. */
const UMBRAL_ARRASTRE = 70

type Slide = {
  id: string
  /** Cómo se anuncia la promo en los puntitos y para el lector de pantalla. */
  titulo: string
  contenido: React.ReactNode
}

export function CarruselPromos({ carrito, className = '' }: { carrito: Carrito; className?: string }) {
  const slides: Slide[] = [
    { id: 'lager',  titulo: 'Lager Adulto 22+13 kg',  contenido: <PromoLager carrito={carrito}/> },
    { id: 'rp',     titulo: 'Maxine Razas Pequeñas',  contenido: <PromoRazasPequenas carrito={carrito}/> },
  ]
  const total = slides.length

  // Además del índice se guarda hacia dónde se fue, que es lo que decide de qué
  // lado entra y sale cada promo.
  const [[indice, direccion], setEstado] = useState<[number, number]>([0, 0])
  const [pausado, setPausado] = useState(false)
  const reducido = useReducedMotion()

  const mover = useCallback(
    (delta: number) => setEstado(([actual]) => [(actual + delta + total) % total, delta]),
    [total]
  )

  const irA = useCallback(
    (destino: number) => setEstado(([actual]) => [destino, destino > actual ? 1 : -1]),
    []
  )

  // Pasa sola. Se frena mientras el mouse está encima, con el foco adentro
  // (teclado) o si el sistema pide menos movimiento.
  useEffect(() => {
    if (pausado || reducido || total < 2) return
    const id = window.setTimeout(() => mover(1), PAUSA_MS)
    return () => window.clearTimeout(id)
  }, [indice, pausado, reducido, total, mover])

  const alSoltar = (_: unknown, info: PanInfo) => {
    const fuerza = info.offset.x + info.velocity.x * 0.12
    if (fuerza < -UMBRAL_ARRASTRE) mover(1)
    else if (fuerza > UMBRAL_ARRASTRE) mover(-1)
    setPausado(false)
  }

  const slide = slides[indice]

  return (
    <section
      className={`force-white relative overflow-hidden ${className}`}
      style={{ backgroundColor: '#1A0F00' }}
      aria-roledescription="carrusel"
      aria-label="Promos del mes"
      onPointerEnter={() => setPausado(true)}
      onPointerLeave={() => setPausado(false)}
      onFocusCapture={() => setPausado(true)}
      onBlurCapture={() => setPausado(false)}
    >
      <div className="relative min-h-[640px] sm:min-h-[580px] lg:min-h-[640px]">
        <AnimatePresence initial={false} custom={direccion}>
          <motion.div
            key={slide.id}
            custom={direccion}
            variants={{
              entra:  (dir: number) => (reducido ? { opacity: 0 } : { x: dir >= 0 ? '100%' : '-100%', opacity: 0.4 }),
              centro: { x: 0, opacity: 1 },
              sale:   (dir: number) => (reducido ? { opacity: 0 } : { x: dir >= 0 ? '-100%' : '100%', opacity: 0.4 }),
            }}
            initial="entra" animate="centro" exit="sale"
            transition={{ x: { type: 'spring', stiffness: 260, damping: 34 }, opacity: { duration: 0.25 } }}
            drag={total > 1 ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.16}
            dragMomentum={false}
            onDragStart={() => setPausado(true)}
            onDragEnd={alSoltar}
            /* touch-pan-y: arrastrar de costado pasa la promo, hacia abajo scrollea la página */
            className="absolute inset-0 touch-pan-y cursor-grab active:cursor-grabbing"
            aria-roledescription="diapositiva"
            aria-label={`${indice + 1} de ${total}: ${slide.titulo}`}
          >
            {slide.contenido}
          </motion.div>
        </AnimatePresence>

        {/* Flechas */}
        {total > 1 && (
          <>
            <Flecha lado="izquierda" onClick={() => mover(-1)}/>
            <Flecha lado="derecha"   onClick={() => mover(1)}/>
          </>
        )}

        {/* Puntitos */}
        {total > 1 && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5">
            {slides.map((s, i) => {
              const activo = i === indice
              return (
                <button
                  key={s.id}
                  onClick={() => irA(i)}
                  aria-label={`Ver promo ${i + 1}: ${s.titulo}`}
                  aria-current={activo}
                  className="h-2.5 rounded-full cursor-pointer transition-all"
                  style={{
                    width: activo ? '26px' : '10px',
                    backgroundColor: activo ? '#F5A623' : 'rgba(255,255,255,0.4)',
                  }}
                />
              )
            })}
            <span className="sm:hidden text-[10px] ml-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
              deslizá →
            </span>
          </div>
        )}
      </div>
    </section>
  )
}

function Flecha({ lado, onClick }: { lado: 'izquierda' | 'derecha'; onClick: () => void }) {
  const izquierda = lado === 'izquierda'
  const Icono = izquierda ? ChevronLeft : ChevronRight
  return (
    <button
      onClick={onClick}
      aria-label={izquierda ? 'Ver la promo anterior' : 'Ver la promo siguiente'}
      /* En el celular la promo ocupa todo el ancho: ahí se pasa arrastrando y con
         los puntitos, así la flecha no se come el texto. */
      className={`absolute top-1/2 -translate-y-1/2 z-20 w-11 h-11 hidden sm:flex items-center justify-center rounded-full cursor-pointer transition-colors ${
        izquierda ? 'left-3 sm:left-5' : 'right-3 sm:right-5'
      }`}
      style={{
        backgroundColor: 'rgba(0,0,0,0.35)',
        border: '1px solid rgba(255,255,255,0.25)',
        color: '#fff',
        backdropFilter: 'blur(8px)',
      }}
    >
      <Icono className="w-5 h-5"/>
    </button>
  )
}

// ── Promo 1: el combo Lager Adulto ────────────────────────────────────────────

function PromoLager({ carrito }: { carrito: Carrito }) {
  const promo = promoLagerAdulto()

  return (
    <div className="relative w-full h-full">
      {/* Foto cuadrada: en la franja panorámica entra el plano largo con los dos
          perros enteros. El encuadre va bajo (72%) para no cortarles las patas.
          Va nítida: el degradado de abajo es el que separa la foto del texto. */}
      <Image src="/images/lager-promo-22.png" alt="Perros corriendo en el campo al atardecer" fill draggable={false}
             className="object-cover" sizes="100vw" quality={90} priority
             style={{ objectPosition: '50% 72%' }}/>
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(to right, rgba(14,7,0,0.93) 0%, rgba(14,7,0,0.7) 50%, rgba(14,7,0,0.2) 100%)',
      }}/>

      <div className="relative z-10 h-full max-w-6xl mx-auto px-6 sm:px-10 py-16 flex items-center">
        <div className="max-w-xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] mb-4" style={{ color: '#E87010' }}>
            Oferta especial · Lager Adulto
          </p>

          <h2 className="font-heading font-black tracking-tighter text-white mb-4"
              style={{ fontSize: 'clamp(2.6rem,7vw,5.5rem)', lineHeight: 0.9 }}>
            22 kg<br/>
            <span style={{ color: '#F5A623' }}>+ 13 kg</span>
          </h2>

          <p className="mb-8 leading-relaxed max-w-xs" style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1rem' }}>
            Alimento premium para perros adultos al mejor precio del mercado.
          </p>

          <div className="flex items-center gap-5 mb-10">
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-widest font-semibold mb-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Antes</span>
              <span className="font-heading font-bold text-xl line-through" style={{ color: 'rgba(255,255,255,0.3)' }}>{formatearPrecio(promo.lista)}</span>
            </div>
            <div className="w-px h-10 self-center" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}/>
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-widest font-semibold mb-0.5" style={{ color: '#E87010' }}>Precio oferta</span>
              <span className="font-heading font-black" style={{ fontSize: 'clamp(2.2rem,5vw,3.5rem)', color: '#fff', lineHeight: 1 }}>{formatearPrecio(promo.precio)}</span>
            </div>
            <div className="self-end mb-1 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider"
                 style={{ backgroundColor: 'rgba(232,112,16,0.2)', border: '1px solid rgba(232,112,16,0.5)', color: '#F5A623' }}>
              {promo.off}% OFF
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            {promo.combo && (
              <BotonAgregarBolsa producto={promo.combo} varianteIdx={0} carrito={carrito}/>
            )}
            <a href={waURL(`Hola GoPet! Quiero saber más de la promo de Lager Adulto 22+13 kg a ${formatearPrecio(promo.precio)}.`)}
               target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-2 text-sm font-semibold transition-colors hover:text-white cursor-pointer"
               style={{ color: 'rgba(255,255,255,0.6)' }}>
              <WaIcon className="w-4 h-4"/> Consultar por WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Promo 2: Maxine Razas Pequeñas, elegís qué bolsa te llevás ────────────────

function PromoRazasPequenas({ carrito }: { carrito: Carrito }) {
  const producto = buscarProducto('mx-p')
  // Los dos tamaños están en oferta, así que la promo deja elegir cuál sumar.
  const [elegida, setElegida] = useState(0)

  const variante = producto?.variantes[elegida]
  if (!producto || !variante) return null

  const off = descuento(variante)

  return (
    <div className="relative w-full h-full">
      <Image src="/images/promo-rp.png" alt="Dos perros chicos corriendo en el campo al atardecer" fill draggable={false}
             className="object-cover" style={{ objectPosition: '50% 72%' }} sizes="100vw" quality={90}/>
      {/* En el celular el texto va apoyado sobre la foto, como en la de Lager: no
          hay tarjeta que la tape, así que el que hace legible el texto es este
          degradado, cerrado a la izquierda y abierto a la derecha, que es por
          donde vienen corriendo los perros. */}
      <div className="absolute inset-0 sm:hidden" style={{
        background: 'linear-gradient(to right, rgba(6,16,4,0.92) 0%, rgba(6,16,4,0.74) 42%, rgba(6,16,4,0.3) 100%)',
      }}/>
      {/* De ahí para arriba sí hay tarjeta, así que el verde va suave: solo
          asienta la foto en vez de taparla. */}
      <div className="absolute inset-0 hidden sm:block" style={{
        background: 'linear-gradient(to right, rgba(6,18,4,0.7) 0%, rgba(6,18,4,0.4) 45%, rgba(6,18,4,0.04) 100%)',
      }}/>
      {/* Y el borde de abajo oscuro, para empalmar con la ola de la sección
          siguiente. Arranca recién a mitad de la franja: arriba queda el cielo. */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(to bottom, rgba(26,15,0,0) 55%, rgba(26,15,0,0.9) 100%)',
      }}/>

      <div className="relative z-10 h-full max-w-6xl mx-auto px-6 sm:px-10 py-16 flex items-center">
        {/* max-w-lg: con los dos precios tachados, en md los tamaños se apilaban.
            La tarjeta (fondo, borde y blur) arranca recién en sm: en el celular
            ocupaba todo el ancho y tapaba la foto, y la promo quedaba como un
            cuadrado con texto. */}
        <div className="w-full max-w-lg max-sm:[text-shadow:0_2px_14px_rgba(0,0,0,0.65)] sm:rounded-[28px] sm:px-8 sm:py-8 sm:bg-[rgba(6,16,4,0.66)] sm:border sm:border-white/[0.18] sm:backdrop-blur-[16px]">

          {off > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest text-white"
                  style={{ backgroundColor: '#C20808' }}>
              −{off}% off
            </span>
          )}

          <h2 className="font-heading font-black tracking-tighter text-white mt-4 mb-3"
              style={{ fontSize: 'clamp(2rem,4.5vw,3.2rem)', lineHeight: 0.95 }}>
            Maxine Razas<br/>
            <span style={{ color: '#FFD166' }}>Pequeñas</span>
          </h2>

          <p className="leading-relaxed mb-5 max-w-xs sm:max-w-none" style={{ color: 'rgba(255,255,255,0.62)', fontSize: '0.95rem' }}>
            Alta concentración de energía para el metabolismo acelerado de los
            perros chicos. Pollo y arroz, super premium.
          </p>

          {/* Los dos tamaños son botones: el que elegís es el que se suma al
              pedido, y cada uno avisa cuántos llevás. */}
          <p className="text-[11px] uppercase tracking-widest font-semibold mb-2.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Elegí tu bolsa
          </p>
          <div className="grid grid-cols-2 gap-2.5 mb-6 sm:pb-6 sm:border-b sm:border-white/[0.12]">
            {producto.variantes.map((v, idx) => (
              <TamañoPromo
                key={v.etiqueta}
                variante={v}
                activa={idx === elegida}
                enCarrito={carrito.cantidadDe(producto.id, idx)}
                onClick={() => setElegida(idx)}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <BotonAgregarBolsa producto={producto} varianteIdx={elegida} carrito={carrito}/>
            <a href={waURL(`Hola GoPet! Quiero saber más de la bolsa de Maxine Razas Pequeñas ${variante.etiqueta}.`)}
               target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-2 text-sm font-semibold transition-colors hover:text-white cursor-pointer"
               style={{ color: 'rgba(255,255,255,0.6)' }}>
              <WaIcon className="w-4 h-4"/> Consultar por WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Un tamaño de la promo, como botón: la etiqueta arriba y abajo el precio.
 * El elegido queda marcado en dorado; el otro, apagado.
 */
function TamañoPromo({
  variante,
  activa,
  enCarrito,
  onClick,
}: {
  variante: Variante
  activa: boolean
  enCarrito: number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={activa}
      aria-label={`Elegir la bolsa de ${variante.etiqueta}`}
      className="flex flex-col items-start text-left min-w-0 rounded-2xl px-3.5 py-3 cursor-pointer transition-all"
      style={activa
        ? { backgroundColor: 'rgba(255,209,102,0.14)', boxShadow: 'inset 0 0 0 1.5px #FFD166' }
        : { backgroundColor: 'rgba(255,255,255,0.06)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.16)' }}
    >
      <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest font-semibold mb-1"
            style={{ color: activa ? '#FFD166' : 'rgba(255,255,255,0.5)' }}>
        {variante.etiqueta}
        {enCarrito > 0 && (
          <span className="w-4 h-4 flex items-center justify-center rounded-full text-[9px] font-black text-white tabular-nums flex-shrink-0"
                style={{ backgroundColor: '#E87010' }}>
            {enCarrito}
          </span>
        )}
      </span>
      <div className="flex items-baseline flex-wrap gap-x-2">
        <span className="font-heading font-black text-white" style={{ fontSize: 'clamp(1.5rem,4.2vw,2.4rem)', lineHeight: 1 }}>
          {formatearPrecio(variante.precio)}
        </span>
        {variante.antes && (
          <span className="font-heading font-bold text-sm line-through" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {formatearPrecio(variante.antes)}
          </span>
        )}
      </div>
    </button>
  )
}
