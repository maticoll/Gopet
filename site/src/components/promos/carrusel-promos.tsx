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
// `combos`, dentro de catalogo.ts, con el precio de promo ya puesto) y la bolsa
// de Razas Pequeñas se suma como cualquier otra, ya con su 8% off.
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
    { id: 'rp',     titulo: 'Maxine Razas Pequeñas 21 kg', contenido: <PromoRazasPequenas carrito={carrito}/> },
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
          perros enteros. El encuadre va bajo (72%) para no cortarles las patas y
          lleva un desenfoque suave para que sea ambiente y no le pelee al texto.
          El scale tapa el borde que deja el blur. */}
      <Image src="/images/lager-promo-22.png" alt="Perros corriendo en el campo al atardecer" fill draggable={false}
             className="object-cover" sizes="100vw" quality={90} priority
             style={{ objectPosition: '50% 72%', filter: 'blur(4px)', transform: 'scale(1.05)' }}/>
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

// ── Promo 2: Maxine Razas Pequeñas, la bolsa de 21 kg con 8% off ─────────────

function PromoRazasPequenas({ carrito }: { carrito: Carrito }) {
  const producto = buscarProducto('mx-p')
  const variante = producto?.variantes[0]
  if (!producto || !variante) return null

  const off = descuento(variante)
  // La bolsa chica: se muestra al lado, con el mismo formato que la grande.
  const chica = producto.variantes[1]

  return (
    <div className="relative w-full h-full">
      <Image src="/images/promo-rp.png" alt="Dos perros chicos corriendo en el campo al atardecer" fill draggable={false}
             className="object-cover" style={{ objectPosition: '50% 72%' }} sizes="100vw" quality={90}/>
      {/* Verde profundo desde la izquierda, que es donde va el texto */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(to right, rgba(6,18,4,0.94) 0%, rgba(6,18,4,0.74) 45%, rgba(6,18,4,0.15) 100%)',
      }}/>
      {/* Y el borde de abajo bien oscuro, para empalmar con la ola de la sección siguiente */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(to bottom, rgba(26,15,0,0.35) 0%, rgba(26,15,0,0) 40%, rgba(26,15,0,0.92) 100%)',
      }}/>

      <div className="relative z-10 h-full max-w-6xl mx-auto px-6 sm:px-10 py-16 flex items-center">
        {/* max-w-lg: con los dos precios tachados, en md los tamaños se apilaban */}
        <div className="w-full max-w-lg rounded-[28px] px-6 py-7 sm:px-8 sm:py-8"
             style={{ backgroundColor: 'rgba(8,20,6,0.55)', border: '1px solid rgba(255,255,255,0.16)', backdropFilter: 'blur(14px)' }}>

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

          <p className="leading-relaxed mb-6" style={{ color: 'rgba(255,255,255,0.62)', fontSize: '0.95rem' }}>
            Alta concentración de energía para el metabolismo acelerado de los
            perros chicos. Pollo y arroz, super premium.
          </p>

          {/* Los dos tamaños se muestran igual: etiqueta arriba y precio grande.
              El de 21 kg además lleva tachado el precio de lista. */}
          <div className="flex flex-wrap items-end gap-x-8 gap-y-4 mb-6 pb-6"
               style={{ borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
            <TamañoPromo variante={variante}/>
            {chica && <TamañoPromo variante={chica}/>}
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <BotonAgregarBolsa producto={producto} varianteIdx={0} carrito={carrito}/>
            <a href={waURL('Hola GoPet! Quiero saber más de la bolsa de Maxine Razas Pequeñas 21 kg.')}
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

/** Un tamaño de la promo: la etiqueta en dorado y abajo el precio bien grande. */
function TamañoPromo({ variante }: { variante: Variante }) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] uppercase tracking-widest font-semibold mb-0.5" style={{ color: '#FFD166' }}>
        {variante.etiqueta}
      </span>
      <div className="flex items-baseline gap-2">
        <span className="font-heading font-black text-white" style={{ fontSize: 'clamp(2.2rem,5vw,3rem)', lineHeight: 1 }}>
          {formatearPrecio(variante.precio)}
        </span>
        {variante.antes && (
          <span className="font-heading font-bold text-lg line-through" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {formatearPrecio(variante.antes)}
          </span>
        )}
      </div>
    </div>
  )
}
