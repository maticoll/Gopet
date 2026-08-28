"use client";

import { useState, useEffect, useRef } from "react";
import DogGame from "@/components/DogGame";
import Image from "next/image";
import Link from "next/link";
import { PawPrint, ChevronRight, Menu, X, Zap, ShieldCheck, Leaf } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { IgIcon, WaIcon } from "@/components/iconos";
import { IG_HANDLE, igURL, waURL } from "@/lib/contacto";
import { perros, gatos, tamaños, formatearPrecio, promoLagerAdulto, type Producto } from "@/lib/catalogo";
import { useCarrito, type Carrito } from "@/components/carrito/use-carrito";
import { CarritoDrawer } from "@/components/carrito/carrito-drawer";
import { BotonCarrito, BurbujaCarrito } from "@/components/carrito/boton-carrito";
import { SelectorVariantes } from "@/components/carrito/selector-variantes";
import { BarraDescuento } from "@/components/carrito/barra-descuento";

/*
  Paleta "Pet Friendly" — alegre, colorida, amigable
  ─────────────────────────────────────────────────
  Navbar / Footer:  #3D2010  (marrón cacao profundo)
  Hero (fallback):  #3D2010
  Feature strip:    #FEF9E7  (amarillo miel suave)
  Spotlight:        #FFF5EE  (salmón muy claro — permite mix-blend-mode en la bolsa)
  Cómo funciona:    #FFF8F0  (crema cálido)
  Productos:        #FFFFFF  (blanco limpio)
  Beneficios:       #FDEEDD  (arena cálida)
  CTA:              #E87010  (naranja Maxine — más cálido y juguetón que el rojo oscuro)

  Titulos:   #3D2010  en secciones claras
  Subtítulos:#7C5035  marrón medio
  Accent-1:  #C20808  rojo Maxine
  Accent-2:  #E87010  naranja
  Accent-3:  #25A244  verde WhatsApp
*/

// ── Datos de detalle por producto (del catálogo Agrofeed Sep 2025) ────────────

type ProductDetail = {
  formula: string;
  badge: string;
  tier: string;
  features: { emoji: string; title: string; desc: string }[];
};

const productDetails: Record<string, ProductDetail> = {
  "mx-a": {
    formula: "Fórmula optimizada para máximo rendimiento. Alta concentración de energía. Pollo y arroz.",
    badge: "HIGH PERFORMANCE", tier: "Super Premium",
    features: [
      { emoji:"💪", title:"Músculos fuertes y sanos",          desc:"Proteínas de alta biodisponibilidad para mantener la masa muscular óptima." },
      { emoji:"✨", title:"Pelaje saludable y brillante",       desc:"Ácidos grasos esenciales para un pelaje radiante y sedoso." },
      { emoji:"🛡️", title:"Sistema inmunológico",              desc:"Antioxidantes naturales que refuerzan las defensas del organismo." },
      { emoji:"🌿", title:"Cuidado del tracto intestinal",      desc:"Prebióticos naturales que promueven una digestión saludable." },
    ],
  },
  "mx-c": {
    formula: "Fórmula ajustada para un óptimo crecimiento y desarrollo de animales jóvenes.",
    badge: "HIGH PERFORMANCE", tier: "Super Premium",
    features: [
      { emoji:"🦴", title:"Músculos y huesos sanos",            desc:"Calcio y fósforo en proporción ideal para el desarrollo óseo." },
      { emoji:"✨", title:"Pelaje saludable y brillante",       desc:"Nutrientes esenciales para un pelaje sedoso desde cachorro." },
      { emoji:"🌿", title:"Cuidado del tracto intestinal",      desc:"Fórmula de alta digestibilidad adaptada para estómagos jóvenes." },
      { emoji:"🌱", title:"Con Prebióticos naturales",          desc:"Flora intestinal equilibrada para una digestión segura y eficiente." },
    ],
  },
  "mx-s": {
    formula: "Máxima protección de articulaciones con Glucosamina y Condroitina. Antioxidantes naturales (vitaminas E, C y Selenio). Con extracto de Yuca.",
    badge: "HIGH PERFORMANCE", tier: "Super Premium",
    features: [
      { emoji:"🦴", title:"Salud articular",                    desc:"Glucosamina y Condroitina para proteger articulaciones en perros maduros." },
      { emoji:"🌿", title:"Cuidado del tracto digestivo",       desc:"Extracto de Yuca y prebióticos para una digestión óptima." },
      { emoji:"🛡️", title:"Sistema inmunológico",              desc:"Vitaminas E, C y Selenio como antioxidantes naturales potentes." },
      { emoji:"🌱", title:"Con Prebióticos naturales",          desc:"Equilibrio de la flora intestinal para mayor bienestar." },
    ],
  },
  "mx-p": {
    formula: "Fórmula optimizada para máximo rendimiento en razas pequeñas. Alta concentración de energía. Pollo y arroz.",
    badge: "HIGH PERFORMANCE", tier: "Super Premium",
    features: [
      { emoji:"🌿", title:"Salud intestinal",                   desc:"Digestión adaptada al metabolismo acelerado de razas pequeñas." },
      { emoji:"💪", title:"Energía muscular",                   desc:"Alta concentración de proteínas para mantener la vitalidad." },
      { emoji:"🛡️", title:"Protección inmunológica",           desc:"Refuerzo natural del sistema inmune con antioxidantes." },
      { emoji:"🌱", title:"Ingredientes naturales",             desc:"Sin colorantes artificiales, 100% ingredientes naturales." },
    ],
  },
  "mx-g": {
    formula: "Cuidado integral de la salud felina. Previene y controla la formación de bola de pelos. Excelente digestión, reduce volumen y olor en las heces.",
    badge: "HIGH PERFORMANCE", tier: "Super Premium",
    features: [
      { emoji:"🥩", title:"Proteínas de máxima calidad",        desc:"Alta concentración de proteínas con cantidad controlada de minerales." },
      { emoji:"🛡️", title:"Sistema inmunológico óptimo",        desc:"Antioxidantes y vitaminas para una inmunidad robusta." },
      { emoji:"🧪", title:"Ph urinario controlado",             desc:"Fórmula que equilibra el Ph urinario y reduce riesgos renales." },
      { emoji:"🌿", title:"Sabor 100% natural",                 desc:"Sin colorantes artificiales, sabor que los gatos adoran." },
    ],
  },
  "mx-gc": {
    formula: "Fórmula específica para gatos castrados. Ayuda a controlar el peso. Excelente digestibilidad. Reduce volumen y olor en las heces.",
    badge: "HIGH PERFORMANCE", tier: "Super Premium",
    features: [
      { emoji:"⚖️", title:"Control de peso",                    desc:"Fórmula balanceada para el metabolismo reducido del gato castrado." },
      { emoji:"🧪", title:"Ph urinario equilibrado",            desc:"Minerales controlados para proteger la salud renal." },
      { emoji:"🛡️", title:"Sistema inmunológico",              desc:"Vitaminas y antioxidantes para defender el organismo." },
      { emoji:"🌿", title:"Ingredientes naturales",             desc:"Sin colorantes artificiales, digestión suave y eficiente." },
    ],
  },
  "lg-a": {
    formula: "1er Alimento Premium del Uruguay. Ingredientes 100% naturales. Balanceado y nutritivo.",
    badge: "ALTA CALIDAD", tier: "Premium",
    features: [
      { emoji:"🍽️", title:"Excelente nutrición y sabor",       desc:"Fórmula que combina palatabilidad superior con nutrición completa." },
      { emoji:"🌿", title:"Salud intestinal",                   desc:"Yuca y pulpa de remolacha para una microbiota intestinal saludable." },
      { emoji:"💪", title:"Mejor condición muscular",           desc:"Proteínas de alta calidad para mantener la masa muscular ideal." },
      { emoji:"✨", title:"Piel y pelaje saludables",           desc:"Ácidos grasos esenciales para un pelaje brillante y piel sana." },
    ],
  },
  "lg-s": {
    formula: "Para perros adultos mayores de 7 años. Ingredientes naturales. 100% balanceado y nutritivo. Reducido en grasa.",
    badge: "ALTA CALIDAD", tier: "Premium",
    features: [
      { emoji:"⚖️", title:"Control de peso",                    desc:"Fórmula reducida en grasa para mantener el peso ideal en perros seniors." },
      { emoji:"❤️", title:"Salud renal y calidad de vida",      desc:"Ingredientes que cuidan los riñones y mejoran el bienestar general." },
      { emoji:"🦴", title:"Protección ostearticular",           desc:"Glucosaminas y Condroitina para articulaciones flexibles y sin dolor." },
      { emoji:"🛡️", title:"Inmunidad con Probióticos",         desc:"Flora intestinal reforzada para una salud óptima en la vejez." },
    ],
  },
  "lg-p": {
    formula: "Para perros adultos de razas pequeñas. Ingredientes naturales. 100% balanceado y nutritivo.",
    badge: "ALTA CALIDAD", tier: "Premium",
    features: [
      { emoji:"🌿", title:"Salud intestinal",                   desc:"Probióticos y pulpa de remolacha para una digestión perfecta." },
      { emoji:"✨", title:"Pelo sano y brillante",              desc:"Omega 3 y 6, ácidos grasos esenciales para un pelaje impecable." },
      { emoji:"💪", title:"Vigor muscular",                     desc:"Proteínas de alta calidad adaptadas al metabolismo de razas pequeñas." },
      { emoji:"🌱", title:"Ingredientes naturales",             desc:"Sin colorantes artificiales, fórmula limpia y transparente." },
    ],
  },
  "lg-c": {
    formula: "Para cachorros saludables. Ingredientes naturales. 100% balanceado y nutritivo.",
    badge: "ALTA CALIDAD", tier: "Premium",
    features: [
      { emoji:"🦴", title:"Crecimiento de huesos y músculos",   desc:"Calcio y fósforo en proporción ideal para un desarrollo óptimo." },
      { emoji:"🌱", title:"Ingredientes naturales",             desc:"Fórmula sin aditivos artificiales, segura para cachorros." },
      { emoji:"🌿", title:"Máxima salud intestinal",            desc:"Alta digestibilidad para estómagos jóvenes en desarrollo." },
      { emoji:"✨", title:"Pelaje brillante y saludable",       desc:"Nutrientes esenciales para un pelaje hermoso desde pequeño." },
    ],
  },
  "lg-g": {
    formula: "Con Taurina. Omega 3 y 6. Enriquecido con Aceite de Pescado. Mix Pescado y Carne.",
    badge: "ALTA CALIDAD", tier: "Premium",
    features: [
      { emoji:"🚿", title:"Protege el tracto urinario",         desc:"Fórmula con control de minerales para la salud renal y urinaria." },
      { emoji:"❤️", title:"Corazón y visión saludables",        desc:"Taurina esencial para el correcto funcionamiento cardíaco y visual." },
      { emoji:"✨", title:"Pelo suave y brillante",             desc:"Omega 3 y 6 para un manto felino reluciente y sedoso." },
      { emoji:"🥩", title:"Proteína de alta calidad",           desc:"Mix de pescado y carne para un sabor irresistible y nutrición completa." },
    ],
  },
  "lg-gc": {
    formula: "Ayuda a controlar el peso. Excelente digestibilidad. Reducido en minerales para protección renal. Elaborado con salmón. Mix Salmón y Pollo.",
    badge: "ALTA CALIDAD", tier: "Premium",
    features: [
      { emoji:"⚖️", title:"Control de peso",                    desc:"Reducido en minerales y grasa para el metabolismo del gato castrado." },
      { emoji:"🚿", title:"Protege el tracto urinario",         desc:"Menos minerales para prevenir cálculos urinarios y proteger riñones." },
      { emoji:"❤️", title:"Corazón y visión saludables",        desc:"Taurina que cuida el sistema cardiovascular y la salud visual." },
      { emoji:"🥩", title:"Proteína sin colorantes",            desc:"Mix de salmón y pollo, sabor natural y fórmula limpia." },
    ],
  },
};

// Onda suave y orgánica entre secciones. Doble capa: una onda de fondo translúcida
// que asoma como sombra y una onda principal sólida encima → sensación de relieve.
// La onda se genera muestreando una sinusoide y uniendo los puntos con curvas
// cúbicas suaves (control en el punto medio) para que no haya quiebres.

function SectionDivider({ fromColor, toColor = "#FFFFFF" }: { fromColor: string; toColor?: string }) {
  const W = 1440, H = 90;

  // Onda que rellena la franja superior (fromColor) hasta la línea ondulada.
  // Se colocan puntos en crestas y valles alternados (±amp respecto a baseY) y se
  // unen con cúbicas de tangente horizontal (control en el punto medio) → onda
  // continua y sin quiebres. `bumps` = nº de extremos; `up` invierte la fase.
  const wavePath = (amp: number, baseY: number, bumps: number, up: boolean) => {
    const pts: [number, number][] = [];
    for (let i = 0; i <= bumps; i++) {
      const x = (W / bumps) * i;
      const dir = (i % 2 === 0) === up ? -1 : 1;
      pts.push([+x.toFixed(1), +(baseY + amp * dir).toFixed(1)]);
    }
    let d = `M ${W},0 L 0,0 L 0,${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[i + 1];
      const mx = +((x0 + x1) / 2).toFixed(1);
      d += ` C ${mx},${y0} ${mx},${y1} ${x1},${y1}`;
    }
    return d + ` L ${W},0 Z`;
  };

  // Capa de fondo: baseline más baja + fase invertida → asoma como cinta de sombra.
  const back  = wavePath(18, 58, 5, true);
  // Capa principal sólida, un poco más arriba.
  const front = wavePath(20, 40, 5, false);

  return (
    <div style={{ display:"block", lineHeight:0, backgroundColor: toColor, position:"relative", zIndex:5 }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width:"100%", height:"clamp(50px,5.5vw,90px)", display:"block", marginTop:"-1px" }}
        aria-hidden
      >
        <path d={back}  fill={fromColor} opacity={0.35}/>
        <path d={front} fill={fromColor}/>
      </svg>
    </div>
  );
}

// ── Product Modal ─────────────────────────────────────────────────────────────

function ProductModal({ p, onClose, carrito }: { p: Producto; onClose: () => void; carrito: Carrito }) {
  const det = productDetails[p.id];
  const msg = `Hola GoPet! Quiero pedir ${p.marca} ${p.nombre} (${tamaños(p)}). ¿Está disponible?`;

  // Cerrar con Escape
  const handleKey = (e: React.KeyboardEvent) => { if (e.key === "Escape") onClose(); };

  if (!det) return null;
  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
        style={{ backgroundColor:"rgba(0,0,0,0.6)", backdropFilter:"blur(6px)" }}
        onClick={onClose}
        onKeyDown={handleKey}
        tabIndex={-1}
      >
        {/* Panel */}
        <motion.div
          key="panel"
          initial={{ opacity:0, y:60 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:60 }}
          transition={{ type:"spring", damping:28, stiffness:320 }}
          className="relative w-full sm:max-w-2xl max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl"
          style={{ backgroundColor:"#FFFBF6" }}
          onClick={e => e.stopPropagation()}
        >
          {/* Handle bar (mobile) */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-10 h-1 rounded-full" style={{ backgroundColor:"#E8D5BF" }}/>
          </div>

          {/* Cabecera con imagen */}
          <div className="relative h-52 sm:h-64 flex items-center justify-center overflow-hidden rounded-t-3xl sm:rounded-t-3xl"
               style={{ backgroundColor:"#FFF5EE" }}>
            <Image src={p.imagen} alt={`${p.marca} ${p.nombre}`} fill className="object-contain p-6 sm:p-10"
                   sizes="(max-width:640px) 100vw, 672px" priority/>
            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-col gap-1.5">
              <span className="text-xs font-heading font-bold px-2.5 py-1 rounded-full text-white"
                    style={{ backgroundColor: p.color }}>{p.marca}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                    style={{ backgroundColor:"rgba(255,255,255,0.85)", color:"#3D2010" }}>{det.tier}</span>
            </div>
            {/* Close */}
            <button onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full transition-colors cursor-pointer"
                    style={{ backgroundColor:"rgba(255,255,255,0.85)", color:"#3D2010" }}
                    aria-label="Cerrar">
              <X className="w-4 h-4"/>
            </button>
          </div>

          {/* Contenido */}
          <div className="p-5 sm:p-7">
            {/* Título */}
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: p.color }}>{det.badge}</p>
              <h2 className="font-heading font-black text-2xl sm:text-3xl tracking-tight" style={{ color:"#3D2010" }}>
                {p.marca} <span style={{ color: p.color }}>{p.nombre}</span>
              </h2>
              <p className="text-sm mt-1.5 leading-relaxed" style={{ color:"#9C7050" }}>{det.formula}</p>
            </div>

            {/* Presentaciones — tamaño, precio y botón para sumarlo al carrito */}
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color:"#C4804A" }}>Presentaciones</p>
              <SelectorVariantes producto={p} carrito={carrito} tamaño="grande"/>
            </div>

            {/* Beneficios */}
            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color:"#C4804A" }}>Beneficios</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {det.features.map(f => (
                  <div key={f.title} className="flex items-start gap-3 p-3 rounded-2xl"
                       style={{ backgroundColor:"#FFF5EE", border:"1px solid #F0DCCB" }}>
                    <span className="text-xl mt-0.5 leading-none">{f.emoji}</span>
                    <div>
                      <p className="font-heading font-bold text-sm leading-tight" style={{ color:"#3D2010" }}>{f.title}</p>
                      <p className="text-xs mt-0.5 leading-snug" style={{ color:"#9C7050" }}>{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <a href={waURL(msg)} target="_blank" rel="noopener noreferrer"
               className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl font-heading font-black text-base text-white transition-all hover:brightness-110 cursor-pointer"
               style={{ backgroundColor:"#E87010", boxShadow:"0 8px 24px rgba(232,112,16,0.35)" }}>
              <WaIcon className="w-5 h-5"/> Pedir por WhatsApp
            </a>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Product card ──────────────────────────────────────────────────────────────

function ProductCard({ p, onClick, carrito }: { p: Producto; onClick: () => void; carrito: Carrito }) {
  const isBestseller = p.id === "mx-a";
  return (
    <motion.div
      initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }}
      viewport={{ once:true }} transition={{ duration:0.4, ease:[0.25,1,0.5,1] }}
      className="rounded-2xl overflow-hidden flex flex-col hover:shadow-xl transition-shadow relative"
      style={{ border: isBestseller ? "1.5px solid #E87010" : "1px solid #E8D5BF", backgroundColor:"#FFFFFF" }}
    >
      {isBestseller && (
        <div className="absolute top-0 right-4 z-10 flex flex-col items-center pt-2 pb-3"
             style={{
               width: "52px",
               background: "#F5A800",
               clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 82%, 0 100%)",
               filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.18))",
             }}>
          <svg viewBox="0 0 32 32" fill="black" className="w-5 h-5 mb-1" aria-hidden>
            <path d="M26 4h-3V2H9v2H6C4.9 4 4 4.9 4 6v2c0 3.1 2.1 5.7 5 6.3C10.2 17 13 19.3 16 19.8V23h-3c-1.1 0-2 .9-2 2v1h10v-1c0-1.1-.9-2-2-2h-3v-3.2c3-.5 5.8-2.8 7-5.5 2.9-.6 5-3.2 5-6.3V6c0-1.1-.9-2-2-2zM6 8V6h3v5.8C7.3 11.1 6 9.7 6 8zm20 0c0 1.7-1.3 3.1-3 3.8V6h3v2z"/>
          </svg>
          <span className="font-black text-black leading-none" style={{ fontSize:"9px", letterSpacing:"0.03em", textAlign:"center", lineHeight:1.1 }}>MÁS{"\n"}VENDIDO</span>
        </div>
      )}
      {/* Zona imagen — clickeable para abrir detalle */}
      <div className="relative h-36 sm:h-48 flex items-center justify-center overflow-hidden cursor-pointer group"
           style={{ backgroundColor:"#FFFBF6" }}
           onClick={onClick}>
        <Image src={p.imagen} alt={`${p.marca} ${p.nombre}`} fill className="object-contain p-2 sm:p-3 group-hover:scale-105 transition-transform duration-300"
               sizes="(max-width:640px) 50vw,(max-width:1024px) 33vw,25vw"/>
        <span className="absolute top-2 left-2 text-[10px] sm:text-xs font-heading font-bold px-1.5 sm:px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: p.color }}>
          {p.marca}
        </span>
        {/* Indicador "Ver más" */}
        <span className="absolute bottom-2 right-2 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ backgroundColor:"rgba(61,32,16,0.75)", color:"#fff" }}>
          Ver más
        </span>
      </div>
      <div className="p-3 sm:p-4 flex flex-col gap-2 sm:gap-3 flex-1">
        <div className="cursor-pointer" onClick={onClick}>
          <h3 className="font-heading font-bold text-sm sm:text-base leading-tight" style={{ color:"#3D2010" }}>{p.nombre}</h3>
          <p className="text-[10px] sm:text-xs mt-0.5" style={{ color:"#9C7050" }}>{p.desc}</p>
        </div>
        <div className="mt-auto">
          <SelectorVariantes producto={p} carrito={carrito}/>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Landing() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const lastScrollY = useRef(0);
  const generalWA = waURL("Hola GoPet! Quiero hacer un pedido.");

  const carrito = useCarrito();
  const promo = promoLagerAdulto();

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY < 10) {
        setHeaderVisible(true);
      } else if (currentY < lastScrollY.current) {
        setHeaderVisible(true);  // subiendo → mostrar
      } else {
        setHeaderVisible(false); // bajando → ocultar
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* ══ NAVBAR ══ */}
      <header className="fixed top-0 left-0 right-0 z-50 text-white" style={{ backgroundColor:"#FDF5E8", borderBottom:"1px solid rgba(0,0,0,0.08)", paddingTop:"env(safe-area-inset-top)", transform: headerVisible ? "translateY(0)" : "translateY(-110%)", transition:"transform 0.3s ease" }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between relative">
          <Link href="/" className="flex items-center flex-shrink-0">
            <Image src="/images/logo gopet negro.png" alt="GoPet" width={108} height={36} className="object-contain mt-5" priority />
          </Link>

          {/* Nav centrado absolutamente */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-black/50 absolute left-1/2 -translate-x-1/2">
            <a href="#como-funciona" className="hover:text-black transition-colors">Cómo funciona</a>
            <a href="#productos"     className="hover:text-black transition-colors">Productos</a>
            <a href="#beneficios"    className="hover:text-black transition-colors">Beneficios</a>
          </nav>

          <div className="hidden md:flex items-center gap-3 flex-shrink-0">
            <a href={igURL} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-heading font-bold hover:opacity-90 transition-opacity cursor-pointer"
               style={{ background:"linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)" }}>
              <IgIcon className="w-4 h-4"/> @{IG_HANDLE}
            </a>
            <a href={generalWA} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#25D366] text-white text-sm font-heading font-bold hover:bg-[#1eba58] transition-colors cursor-pointer">
              <WaIcon className="w-4 h-4"/> Pedir ahora
            </a>
            <BotonCarrito totales={carrito.totales} onClick={() => setCarritoAbierto(true)}/>
          </div>

          <div className="md:hidden flex items-center gap-1">
            <BotonCarrito totales={carrito.totales} onClick={() => setCarritoAbierto(true)}/>
            <button className="p-2 cursor-pointer text-black" onClick={() => setMobileOpen(v=>!v)} aria-label="Abrir menú">
              {mobileOpen ? <X className="w-5 h-5"/> : <Menu className="w-5 h-5"/>}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }} exit={{ opacity:0, height:0 }}
                        className="md:hidden overflow-hidden" style={{ backgroundColor:"#FDF5E8", borderTop:"1px solid rgba(0,0,0,0.08)" }}>
              <div className="px-6 py-4 flex flex-col gap-4">
                <a href="#como-funciona" onClick={()=>setMobileOpen(false)} className="text-sm font-medium" style={{ color:"#3D2010" }}>Cómo funciona</a>
                <a href="#productos"     onClick={()=>setMobileOpen(false)} className="text-sm font-medium" style={{ color:"#3D2010" }}>Productos</a>
                <a href="#beneficios"    onClick={()=>setMobileOpen(false)} className="text-sm font-medium" style={{ color:"#3D2010" }}>Beneficios</a>
                <a href={generalWA} target="_blank" rel="noopener noreferrer"
                   className="flex items-center justify-center gap-2 py-3 rounded-full bg-[#25D366] text-white font-heading font-bold text-sm">
                  <WaIcon className="w-4 h-4"/> Pedir ahora
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="flex flex-col sm:block">
        {/* ══════════════════════════════════════════════════════
            HERO — imagen de fondo full-screen
            Guardar imagen en: site/public/images/hero-bg.jpg
        ══════════════════════════════════════════════════════ */}
        <section className="force-white order-1 sm:order-none relative min-h-screen text-white overflow-hidden flex flex-col items-center justify-center"
                 style={{ backgroundColor:"#2a4a1a" }}>
          {/* Fondo mobile (portrait) */}
          <div className="absolute inset-0 sm:hidden" style={{ backgroundImage:"url('/images/fondo%201%20celular.PNG')", backgroundSize:"cover", backgroundPosition:"center center" }}/>
          {/* Fondo desktop (landscape) */}
          <div className="absolute inset-0 hidden sm:block" style={{ backgroundImage:"url('/images/fondo%201%20computadora.png')", backgroundSize:"cover", backgroundPosition:"center center" }}/>

          {/* Overlay: más oscuro arriba (cielo claro), transparente al centro, sutil abajo */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background:"linear-gradient(to bottom, rgba(20,40,10,0.72) 0%, rgba(20,40,10,0.35) 40%, rgba(20,40,10,0.55) 70%, rgba(20,40,10,0.80) 100%)"
          }}/>

          <div className="relative z-10 max-w-4xl mx-auto w-full px-6 py-32 flex flex-col items-center text-center">
            <motion.div initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.7, ease:[0.25,1,0.5,1] }} className="flex flex-col items-center">
              <div className="inline-flex items-center gap-2 mb-7 px-4 py-2 rounded-full text-xs text-white/80"
                   style={{ border:"1px solid rgba(255,255,255,0.25)", backgroundColor:"rgba(0,0,0,0.3)", backdropFilter:"blur(10px)" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-[#25D366]"/>
                Uruguay · Envío gratis a domicilio
              </div>

              <h1 className="font-heading font-black leading-[0.88] tracking-tighter mb-6 text-[clamp(2.8rem,9vw,7rem)]">
                La Ración Que<br/>
                Tu Mascota<br/>
                <span style={{ color:"#FFD166" }}>Merece.</span>
              </h1>

              <p className="text-white/75 text-base sm:text-xl max-w-lg mb-10 leading-relaxed">
                Alimento premium Maxine y Lager — Agrofeed Uruguay.<br className="hidden sm:block"/>
                Envío gratis a domicilio. Todo por WhatsApp.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <a href={generalWA} target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full bg-[#25D366] text-white font-heading font-bold text-base hover:bg-[#1eba58] transition-colors cursor-pointer shadow-xl shadow-black/40">
                  <WaIcon className="w-5 h-5"/> Hacer un pedido
                </a>
                <a href="#productos"
                   className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full border border-white/30 bg-white/10 text-white font-heading font-bold text-base hover:bg-white/20 transition-colors cursor-pointer" style={{ backdropFilter:"blur(8px)" }}>
                  Ver productos <ChevronRight className="w-4 h-4"/>
                </a>
              </div>
            </motion.div>
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10" aria-hidden>
            <motion.div animate={{ y:[0,6,0] }} transition={{ repeat:Infinity, duration:1.8, ease:"easeInOut" }}
                        className="w-px h-10 bg-gradient-to-b from-white/40 to-transparent"/>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            FEATURE STRIP — amarillo miel
        ══════════════════════════════════════════════════════ */}
        <section className="order-3 sm:order-none" style={{ backgroundColor:"#FEF9E7", borderTop:"1px solid #F5E6B0", borderBottom:"1px solid #F5E6B0" }}>
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3" style={{}}>
              {[
                { icon:<Zap className="w-4 h-4" style={{ color:"#E87010" }}/>,       bg:"#FDE8C8", title:"Entrega express",        desc:"Coordinamos la entrega en tu horario. Envío gratis." },
                { icon:<ShieldCheck className="w-4 h-4" style={{ color:"#C20808" }}/>, bg:"#FAD0D0", title:"Marcas de confianza",    desc:"Maxine y Lager · Agrofeed Uruguay. Calidad comprobada." },
                { icon:<Leaf className="w-4 h-4" style={{ color:"#2D9B4A" }}/>,        bg:"#C8F0D8", title:"Asesoría personalizada", desc:"Te ayudamos a elegir la ración correcta. Por WhatsApp." },
              ].map((f, i, arr) => (
                <div key={i} className="flex items-center gap-4 px-6 py-5 md:px-8 md:py-7"
                     style={{
                       borderRight:   i < arr.length - 1 ? "1px solid #F5E6B0" : "none",
                       borderBottom: "1px solid #F5E6B0",
                     }}>
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: f.bg }}>
                    {f.icon}
                  </div>
                  <div>
                    <p className="font-heading font-bold text-sm mb-0.5" style={{ color:"#3D2010" }}>{f.title}</p>
                    <p className="text-xs leading-relaxed" style={{ color:"#9C7050" }}>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            PRODUCTOS — blanco limpio
        ══════════════════════════════════════════════════════ */}
        <section id="productos" className="order-2 sm:order-none py-16 sm:py-24 px-4 sm:px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="mb-10">
              <h2 className="font-heading font-black text-[clamp(2rem,5vw,3.5rem)] tracking-tighter mb-2" style={{ color:"#3D2010" }}>
                Productos 🐶🐱
              </h2>
              <p style={{ color:"#9C7050" }}>Marcas Maxine y Lager — Agrofeed Uruguay</p>
            </div>

            {/* El camino al descuento, a la vista mientras armás el pedido. */}
            <div className="mb-8 max-w-xl">
              <BarraDescuento totales={carrito.totales} titulo="Cuanto más llevás, menos pagás 🏷️"/>
            </div>

            {/* Todo el catálogo a la vista, agrupado por especie. */}
            {([
              { titulo:"🐶 Perros", lista: perros },
              { titulo:"🐱 Gatos",  lista: gatos },
            ]).map(grupo => (
              <div key={grupo.titulo} className="mb-10 last:mb-0">
                <h3 className="font-heading font-black text-lg mb-4 flex items-center gap-2" style={{ color:"#3D2010" }}>
                  {grupo.titulo}
                  <span className="flex-1 h-px" style={{ backgroundColor:"#F0DCCB" }}/>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {grupo.lista.map((p) => (
                    <ProductCard key={p.id} p={p} onClick={() => setSelectedProduct(p)} carrito={carrito}/>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="hidden sm:block"><SectionDivider fromColor="#FFFFFF" toColor="#FFF5EE"/></div>

        {/* ══════════════════════════════════════════════════════
            PRODUCT SPOTLIGHT — salmón muy claro
            La bolsa usa mix-blend-mode:multiply → fondo desaparece
            Container: 896×560px · viewBox 0 0 896 560
        ══════════════════════════════════════════════════════ */}
        <section className="order-4 sm:order-none py-24 px-6 overflow-hidden" style={{ backgroundColor:"#FFF5EE" }}>
          <div className="max-w-6xl mx-auto">

            <motion.div initial={{ opacity:0, y:16 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} transition={{ duration:0.55 }}
                        className="text-center mb-8">
              <span className="inline-flex items-center gap-3 text-[11px] font-medium tracking-[0.2em] uppercase mb-5" style={{ color:"#C4804A" }}>
                <span className="w-10 h-px inline-block" style={{ backgroundColor:"#E8C8A8" }}/>
                Producto estrella
                <span className="w-10 h-px inline-block" style={{ backgroundColor:"#E8C8A8" }}/>
              </span>
              <h2 className="font-heading font-black text-[clamp(2.2rem,5vw,4rem)] tracking-tighter mb-3" style={{ color:"#3D2010" }}>
                Maxine Adultos <span style={{ color:"#E87010" }}>Super Premium</span>
              </h2>
              <p className="text-sm max-w-xs mx-auto leading-relaxed" style={{ color:"#9C7050" }}>
                Fórmula de alto rendimiento para perros adultos de todas las razas.
              </p>
            </motion.div>

            {/* Desktop: spotlight con SVG ─────────────────────────── */}
            {/* Container 896×700 · viewBox 0 0 896 700 · bolsa 380×510px centrada */}
            <div className="hidden lg:block relative mx-auto" style={{ maxWidth:"896px", height:"700px" }}>

              {/* Líneas SVG de anotación */}
              <svg aria-hidden className="absolute inset-0 pointer-events-none" width="100%" height="100%"
                   viewBox="0 0 896 700" preserveAspectRatio="none">
                <defs>
                  <marker id="circ" markerWidth="6" markerHeight="6" refX="3" refY="3">
                    <circle cx="3" cy="3" r="2" fill="#C4804A" fillOpacity="0.5"/>
                  </marker>
                </defs>
                {/* Izquierda → bolsa (bolsa left edge ~258) */}
                <line x1="196" y1="70"  x2="275" y2="200" stroke="#C4804A" strokeOpacity="0.3" strokeWidth="1" strokeDasharray="4 5" markerStart="url(#circ)"/>
                <line x1="196" y1="340" x2="265" y2="340" stroke="#C4804A" strokeOpacity="0.3" strokeWidth="1" strokeDasharray="4 5" markerStart="url(#circ)"/>
                <line x1="196" y1="610" x2="275" y2="500" stroke="#C4804A" strokeOpacity="0.3" strokeWidth="1" strokeDasharray="4 5" markerStart="url(#circ)"/>
                {/* Derecha → bolsa (bolsa right edge ~638) */}
                <line x1="700" y1="70"  x2="621" y2="200" stroke="#C4804A" strokeOpacity="0.3" strokeWidth="1" strokeDasharray="4 5" markerStart="url(#circ)"/>
                <line x1="700" y1="340" x2="631" y2="340" stroke="#C4804A" strokeOpacity="0.3" strokeWidth="1" strokeDasharray="4 5" markerStart="url(#circ)"/>
                <line x1="700" y1="610" x2="621" y2="500" stroke="#C4804A" strokeOpacity="0.3" strokeWidth="1" strokeDasharray="4 5" markerStart="url(#circ)"/>
                {/* Dots sobre la bolsa — izquierda */}
                <circle cx="275" cy="200" r="4" fill="none" stroke="#E87010" strokeWidth="1.5"/><circle cx="275" cy="200" r="2" fill="#E87010"/>
                <circle cx="265" cy="340" r="4" fill="none" stroke="#E87010" strokeWidth="1.5"/><circle cx="265" cy="340" r="2" fill="#E87010"/>
                <circle cx="275" cy="500" r="4" fill="none" stroke="#E87010" strokeWidth="1.5"/><circle cx="275" cy="500" r="2" fill="#E87010"/>
                {/* Dots sobre la bolsa — derecha */}
                <circle cx="621" cy="200" r="4" fill="none" stroke="#C20808" strokeWidth="1.5"/><circle cx="621" cy="200" r="2" fill="#C20808"/>
                <circle cx="631" cy="340" r="4" fill="none" stroke="#C20808" strokeWidth="1.5"/><circle cx="631" cy="340" r="2" fill="#C20808"/>
                <circle cx="621" cy="500" r="4" fill="none" stroke="#C20808" strokeWidth="1.5"/><circle cx="621" cy="500" r="2" fill="#C20808"/>
              </svg>

              {/* ── Bolsa centrada ── 380×510px con float animation */}
              <div className="absolute" style={{ left:"50%", top:"50%", transform:"translate(-50%,-50%)", width:"380px", height:"510px", zIndex:10 }}>
                <motion.div
                  animate={{ y:[0,-14,0] }}
                  transition={{ repeat:Infinity, duration:4.5, ease:"easeInOut" }}
                  style={{ width:"100%", height:"100%", mixBlendMode:"multiply" }}
                >
                  <Image src="/images/maxine-adulto.png" alt="Maxine Adultos Super Premium 21 kg"
                         fill className="object-contain" sizes="380px" priority/>
                </motion.div>
              </div>

              {/* Callouts izquierda — centros en y: 70, 340, 610 */}
              {[
                { top:25,  title:"Agrofeed Uruguay", desc:"Empresa productora nacional. Respaldo y calidad garantizada.", dot:"#E87010" },
                { top:295, title:"Super Premium",    desc:"Fórmula premium con nutrientes de alta biodisponibilidad.",   dot:"#E87010" },
                { top:565, title:"Pollo y Arroz",    desc:"Fuente principal de proteína y energía de fácil digestión.",  dot:"#E87010" },
              ].map(({ top, title, desc, dot }, i) => (
                <motion.div key={title} initial={{ opacity:0, x:-20 }} whileInView={{ opacity:1, x:0 }}
                            viewport={{ once:true }} transition={{ duration:0.5, delay:i*0.1 }}
                            className="absolute text-right" style={{ left:0, top, width:"190px", zIndex:10 }}>
                  <div className="rounded-2xl px-4 py-3" style={{ border:"1px solid #E8C8A8", backgroundColor:"rgba(255,255,255,0.7)", backdropFilter:"blur(8px)" }}>
                    <div className="flex items-center justify-end gap-1.5 mb-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor:dot }}/>
                      <p className="font-heading font-bold text-[13px] leading-tight" style={{ color:"#3D2010" }}>{title}</p>
                    </div>
                    <p className="text-[11px] leading-snug" style={{ color:"#9C7050" }}>{desc}</p>
                  </div>
                </motion.div>
              ))}

              {/* Callouts derecha — centros en y: 70, 340, 610 */}
              {[
                { top:25,  title:"High Performance", desc:"Optimizado para el máximo rendimiento y vitalidad canina.", dot:"#C20808" },
                { top:295, title:"Razas Adultas",    desc:"Formulado para perros de 1 a 7 años de todas las razas.",  dot:"#C20808" },
                { top:565, title:"21+4 kg gratis",   desc:"Gran bolsa familiar. Sello de garantía Maxine certificado.", dot:"#C20808" },
              ].map(({ top, title, desc, dot }, i) => (
                <motion.div key={title} initial={{ opacity:0, x:20 }} whileInView={{ opacity:1, x:0 }}
                            viewport={{ once:true }} transition={{ duration:0.5, delay:i*0.1 }}
                            className="absolute text-left" style={{ right:0, top, width:"190px", zIndex:10 }}>
                  <div className="rounded-2xl px-4 py-3" style={{ border:"1px solid #E8C8A8", backgroundColor:"rgba(255,255,255,0.7)", backdropFilter:"blur(8px)" }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor:dot }}/>
                      <p className="font-heading font-bold text-[13px] leading-tight" style={{ color:"#3D2010" }}>{title}</p>
                    </div>
                    <p className="text-[11px] leading-snug" style={{ color:"#9C7050" }}>{desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Mobile */}
            <div className="lg:hidden flex flex-col items-center gap-6 mt-2">
              <div className="relative" style={{ width:"240px", height:"320px" }}>
                <div style={{ position:"absolute", inset:0, mixBlendMode:"multiply" as const }}>
                  <Image src="/images/maxine-adulto.png" alt="Maxine Adultos 21+4 kg gratis" fill className="object-contain" sizes="240px"/>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 w-full max-w-sm">
                {[["Agrofeed","Marca nacional"],["Super Premium","Alta calidad"],["Pollo y Arroz","Proteína natural"],
                  ["High Performance","Máx. rendimiento"],["Razas Adultas","1 a 7 años"],["21+4 kg gratis","Gran bolsa"]].map(([label, sub]) => (
                  <div key={label} className="rounded-xl p-2.5 text-center" style={{ border:"1px solid #E8C8A8", backgroundColor:"rgba(255,255,255,0.7)" }}>
                    <p className="font-heading font-bold text-[10px] leading-tight" style={{ color:"#3D2010" }}>{label}</p>
                    <p className="text-[9px] mt-0.5" style={{ color:"#9C7050" }}>{sub}</p>
                  </div>
                ))}
              </div>
            </div>

            <motion.div initial={{ opacity:0, y:12 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} transition={{ duration:0.5, delay:0.4 }}
                        className="text-center mt-16">
              <a href={waURL("Hola GoPet! Quiero pedir Maxine Adultos Super Premium 21 kg.")}
                 target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full text-white font-heading font-bold text-sm hover:opacity-90 transition-opacity cursor-pointer"
                 style={{ backgroundColor:"#E87010" }}>
                <WaIcon className="w-4 h-4"/> Pedir Maxine Adultos
              </a>
              <p className="text-[11px] mt-3" style={{ color:"#C4804A" }}>También disponible: Cachorros · Senior · Razas Pequeñas · Gatos</p>
            </motion.div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            PROMO LAGER ADULTO
        ══════════════════════════════════════════════════════ */}
        <section className="force-white order-5 sm:order-none relative overflow-hidden" style={{ backgroundColor:"#1A0F00" }}>
          {/* Imagen de fondo */}
          <div className="absolute inset-0">
            <Image src="/images/promo-lager-2.png" alt="Lager Adulto promoción" fill
              className="object-cover object-center" sizes="100vw" quality={100} priority/>
            <div className="absolute inset-0" style={{
              background:"linear-gradient(to right, rgba(14,7,0,0.93) 0%, rgba(14,7,0,0.7) 50%, rgba(14,7,0,0.2) 100%)"
            }}/>
          </div>

          <div className="relative z-10 max-w-6xl mx-auto px-6 sm:px-10 py-20 lg:py-32">
            <motion.div initial={{ opacity:0, y:24 }} whileInView={{ opacity:1, y:0 }}
                        viewport={{ once:true }} transition={{ duration:0.6, ease:[0.25,1,0.5,1] }}
                        className="max-w-xl">

              {/* Eyebrow */}
              <p className="text-xs font-bold uppercase tracking-[0.2em] mb-4" style={{ color:"#E87010" }}>
                Oferta especial · Lager Adulto
              </p>

              {/* Título */}
              <h2 className="font-heading font-black tracking-tighter text-white mb-4"
                  style={{ fontSize:"clamp(3rem,7vw,5.5rem)", lineHeight:0.9 }}>
                22 kg<br/>
                <span style={{ color:"#F5A623" }}>+ 13 kg</span>
              </h2>

              {/* Descripción */}
              <p className="mb-8 leading-relaxed max-w-xs" style={{ color:"rgba(255,255,255,0.55)", fontSize:"1rem" }}>
                Alimento premium para perros adultos al mejor precio del mercado.
              </p>

              {/* Precios */}
              <div className="flex items-center gap-5 mb-10">
                <div className="flex flex-col">
                  <span className="text-[11px] uppercase tracking-widest font-semibold mb-0.5" style={{ color:"rgba(255,255,255,0.35)" }}>Antes</span>
                  <span className="font-heading font-bold text-xl line-through" style={{ color:"rgba(255,255,255,0.3)" }}>{formatearPrecio(promo.lista)}</span>
                </div>
                <div className="w-px h-10 self-center" style={{ backgroundColor:"rgba(255,255,255,0.15)" }}/>
                <div className="flex flex-col">
                  <span className="text-[11px] uppercase tracking-widest font-semibold mb-0.5" style={{ color:"#E87010" }}>Precio oferta</span>
                  <span className="font-heading font-black" style={{ fontSize:"clamp(2.4rem,5vw,3.5rem)", color:"#fff", lineHeight:1 }}>{formatearPrecio(promo.precio)}</span>
                </div>
                <div className="self-end mb-1 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider"
                     style={{ backgroundColor:"rgba(232,112,16,0.2)", border:"1px solid rgba(232,112,16,0.5)", color:"#F5A623" }}>
                  {promo.off}% OFF
                </div>
              </div>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row items-start gap-3">
                <a href={waURL(`Hola GoPet! Quiero aprovechar la promo de Lager Adulto 22+13 kg a ${formatearPrecio(promo.precio)}. ¿Está disponible?`)}
                   target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center gap-2.5 px-7 py-4 rounded-2xl font-heading font-black text-base transition-all hover:brightness-110 cursor-pointer"
                   style={{ backgroundColor:"#E87010", color:"#fff", boxShadow:"0 8px 32px rgba(232,112,16,0.4)" }}>
                  <WaIcon className="w-5 h-5"/> Pedir esta promo
                </a>
                <div className="inline-flex items-center gap-2 px-5 py-4 rounded-2xl text-sm font-semibold"
                     style={{ border:"1px solid rgba(255,255,255,0.15)", color:"rgba(255,255,255,0.6)" }}>
                  🚚 Envío gratis a domicilio
                </div>
              </div>

            </motion.div>
          </div>
        </section>

        <div className="hidden sm:block"><SectionDivider fromColor="#1A0F00" toColor="#FFF8F0"/></div>

        {/* ══════════════════════════════════════════════════════
            CÓMO FUNCIONA — crema cálido
        ══════════════════════════════════════════════════════ */}
        <section id="como-funciona" className="order-6 sm:order-none py-16 sm:py-24 px-5 sm:px-6" style={{ backgroundColor:"#FFF8F0" }}>
          <div className="max-w-6xl mx-auto">
            <div className="mb-14">
              <h2 className="font-heading font-black text-[clamp(2rem,5vw,3.5rem)] tracking-tighter mb-2" style={{ color:"#3D2010" }}>
                Cómo funciona 🐾
              </h2>
              <p style={{ color:"#9C7050" }}>Tres pasos, sin complicaciones.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { n:"01", title:"Elegís tu ración",     desc:"Mirá nuestro catálogo y elegí el alimento que mejor le va a tu mascota.", emoji:"🦴" },
                { n:"02", title:"Pedís por WhatsApp",   desc:"Nos mandás un mensaje con tu pedido. Te respondemos al toque.", emoji:"💬" },
                { n:"03", title:"Recibís en tu puerta", desc:"Envío gratis y rápido. Coordinamos el horario que más te convenga.", emoji:"🏠" },
              ].map((step, i) => (
                <motion.div key={step.n} initial={{ opacity:0, y:24 }} whileInView={{ opacity:1, y:0 }}
                            viewport={{ once:true }} transition={{ duration:0.45, delay:i*0.1, ease:[0.25,1,0.5,1] }}
                            className="flex flex-col gap-3 p-6 rounded-3xl" style={{ backgroundColor:"#FFFFFF", border:"1px solid #F0DCCB", boxShadow:"0 4px 20px rgba(61,32,16,0.06)" }}>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{step.emoji}</span>
                    <span className="font-heading font-black text-4xl leading-none" style={{ color:"rgba(232,112,16,0.25)" }}>{step.n}</span>
                  </div>
                  <h3 className="font-heading font-bold text-xl" style={{ color:"#3D2010" }}>{step.title}</h3>
                  <p className="leading-relaxed" style={{ color:"#9C7050" }}>{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <div className="hidden sm:block"><SectionDivider fromColor="#FFF8F0" toColor="#FDEEDD"/></div>

        {/* ══════════════════════════════════════════════════════
            BENEFICIOS — arena cálida
        ══════════════════════════════════════════════════════ */}
        <section id="beneficios" className="order-7 sm:order-none py-16 sm:py-24 px-5 sm:px-6" style={{ backgroundColor:"#FDEEDD" }}>
          <div className="max-w-6xl mx-auto">
            <div className="mb-14">
              <h2 className="font-heading font-black text-[clamp(2rem,5vw,3.5rem)] tracking-tighter mb-2" style={{ color:"#3D2010" }}>
                ¿Por qué GoPet? 🧡
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { emoji:"🚚", bg:"#FDE8C8", title:"Envío gratis y rápido",     desc:"Coordinamos la entrega en el horario que mejor te quede. Sin costo extra." },
                { emoji:"🏷️", bg:"#FBDCC0", title:"Los mejores precios",       desc:"Sin intermediarios, sin locales caros. El precio justo para vos y tu mascota." },
                { emoji:"❤️", bg:"#FFD0DC", title:"Seguimiento de tu mascota", desc:"Te ayudamos a elegir la ración correcta según la edad y raza de tu mascota." },
                { emoji:"🎧", bg:"#F5E2C0", title:"Atención personalizada",    desc:"Respondemos rápido. Consultas, pedidos y soporte — todo por WhatsApp." },
              ].map((b, i) => (
                <motion.div key={b.title} initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }}
                            viewport={{ once:true }} transition={{ duration:0.4, delay:i*0.08, ease:[0.25,1,0.5,1] }}
                            className="bg-white rounded-3xl p-6 flex flex-col gap-4"
                            style={{ border:"1px solid #F0DCCB", boxShadow:"0 4px 20px rgba(61,32,16,0.06)" }}>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl" style={{ backgroundColor:b.bg }}>
                    {b.emoji}
                  </div>
                  <h3 className="font-heading font-bold text-base" style={{ color:"#3D2010" }}>{b.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color:"#9C7050" }}>{b.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <div className="hidden sm:block"><SectionDivider fromColor="#FDEEDD" toColor="#FEF9E7"/></div>

        {/* ══════════════════════════════════════════════════════
            MINIJUEGO — perro come raciones
        ══════════════════════════════════════════════════════ */}
        <section className="order-8 sm:order-none py-24 px-6" style={{ backgroundColor:"#FEF9E7" }}>
          <div className="max-w-6xl mx-auto">
            <motion.div initial={{ opacity:0, y:16 }} whileInView={{ opacity:1, y:0 }}
                        viewport={{ once:true }} transition={{ duration:0.55 }}
                        className="text-center mb-10">
              <span className="inline-flex items-center gap-3 text-[11px] font-medium tracking-[0.2em] uppercase mb-5" style={{ color:"#C4804A" }}>
                <span className="w-10 h-px inline-block" style={{ backgroundColor:"#E8C8A8" }}/>
                Mini juego
                <span className="w-10 h-px inline-block" style={{ backgroundColor:"#E8C8A8" }}/>
              </span>
              <h2 className="font-heading font-black text-[clamp(2rem,5vw,3.5rem)] tracking-tighter mb-2" style={{ color:"#3D2010" }}>
                ¿Aburrido esperando <span style={{ color:"#E87010" }}>el delivery?</span> 🐶
              </h2>
              <p style={{ color:"#9C7050" }}>Ayudá al perro a comer sus raciones. Flechas del teclado o deslizá.</p>
            </motion.div>
            <div className="flex justify-center">
              <DogGame />
            </div>
          </div>
        </section>

        <div className="hidden sm:block"><SectionDivider fromColor="#FEF9E7" toColor="#E87010"/></div>

        {/* ══════════════════════════════════════════════════════
            CTA FINAL — naranja cálido y juguetón
        ══════════════════════════════════════════════════════ */}
        <section className="order-9 sm:order-none py-16 sm:py-28 px-5 sm:px-6 text-white" style={{ backgroundColor:"#E87010" }}>
          <div className="max-w-6xl mx-auto">
            <motion.div initial={{ opacity:0, y:24 }} whileInView={{ opacity:1, y:0 }}
                        viewport={{ once:true }} transition={{ duration:0.6, ease:[0.25,1,0.5,1] }}
                        className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10">
              <div>
                <h2 className="font-heading font-black text-[clamp(2rem,6vw,4rem)] tracking-tighter leading-[0.9] mb-4 text-white">
                  ¿Listo para<br/>hacer tu pedido? 🐾
                </h2>
                <p className="text-white/75 max-w-sm leading-relaxed">
                  Escribinos ahora. Te respondemos al toque y coordinamos la entrega.
                </p>
              </div>

              <div className="flex flex-col gap-4 w-full lg:w-auto">
                <a href={generalWA} target="_blank" rel="noopener noreferrer"
                   className="flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-white font-heading font-black text-lg hover:bg-white/90 transition-colors cursor-pointer whitespace-nowrap"
                   style={{ color:"#3D2010" }}>
                  <WaIcon className="w-5 h-5 text-[#25D366]"/> Pedir por WhatsApp
                </a>
                <a href={igURL} target="_blank" rel="noopener noreferrer"
                   className="flex items-center justify-center gap-3 px-8 py-4 rounded-2xl border border-white/30 text-white font-heading font-bold text-lg hover:bg-white/10 transition-colors cursor-pointer whitespace-nowrap">
                  <IgIcon className="w-5 h-5"/> @{IG_HANDLE}
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="order-10 sm:order-none py-8 px-6 text-white/50" style={{ backgroundColor:"#3D2010" }}>
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 font-heading font-black">
              <span style={{ color:"#FFB347" }}>Go</span>
              <span style={{ color:"#FF6B6B" }}>Pet</span>
              <PawPrint className="w-3.5 h-3.5" style={{ color:"#FF6B6B" }}/>
            </div>
            <p className="text-xs text-center">Alimento para mascotas · Envío a domicilio · Uruguay</p>
            <p className="text-xs">
              Built with Claude Web Builder by{" "}
              <a href="https://tododeia.com" target="_blank" rel="noopener noreferrer" className="hover:text-white/80 underline underline-offset-2">Tododeia</a>
            </p>
          </div>
        </footer>
      </main>

      {/* Modal de detalle de producto */}
      {selectedProduct && (
        <ProductModal
          p={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          carrito={carrito}
        />
      )}

      {/* Carrito */}
      <BurbujaCarrito totales={carrito.totales} onClick={() => setCarritoAbierto(true)}/>
      <CarritoDrawer abierto={carritoAbierto} onCerrar={() => setCarritoAbierto(false)} carrito={carrito}/>
    </>
  );
}
