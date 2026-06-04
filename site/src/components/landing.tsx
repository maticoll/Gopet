"use client";

import { useState } from "react";
import Image from "next/image";
import { PawPrint, Truck, Tag, Heart, Headphones, ChevronRight, Menu, X, Zap, ShieldCheck, Leaf } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import DogGame from "@/components/DogGame";

const WA_NUMBER = "59892360472";
const IG_HANDLE = "gopet_uy";

const waURL = (msg: string) =>
  `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;

const igURL = `https://www.instagram.com/${IG_HANDLE}`;

/*
  Paleta "Pet Friendly" — alegre, colorida, amigable
  ─────────────────────────────────────────────────
  Navbar / Footer:  #3D2010  (marrón cacao profundo)
  Hero (fallback):  #3D2010
  Feature strip:    #FEF9E7  (amarillo miel suave)
  Spotlight:        #FFF5EE  (salmón muy claro — permite mix-blend-mode en la bolsa)
  Cómo funciona:    #EFF9FF  (celeste bebé)
  Productos:        #FFFFFF  (blanco limpio)
  Beneficios:       #F0FFF6  (verde menta suave)
  CTA:              #E87010  (naranja Maxine — más cálido y juguetón que el rojo oscuro)

  Titulos:   #3D2010  en secciones claras
  Subtítulos:#7C5035  marrón medio
  Accent-1:  #C20808  rojo Maxine
  Accent-2:  #E87010  naranja
  Accent-3:  #25A244  verde WhatsApp
*/

type Product = {
  id: string; brand: "Maxine" | "Lager"; name: string; label: string;
  color: string; weight: string; desc: string; image: string;
};

const perros: Product[] = [
  { id:"mx-c", brand:"Maxine", name:"Cachorros",     label:"C",  color:"#E87010", weight:"21 kg / 7.5 kg",          desc:"Para cachorros de todas las razas",  image:"/images/p01.jpg" },
  { id:"mx-a", brand:"Maxine", name:"Adultos",        label:"A",  color:"#C20808", weight:"21+4 kg gratis / 7.5 kg", desc:"Para perros adultos",                image:"/images/p02.jpg" },
  { id:"mx-s", brand:"Maxine", name:"Senior",         label:"S",  color:"#4E9A1A", weight:"21 kg / 7.5 kg",          desc:"Para perros mayores de 7 años",      image:"/images/p03.jpg" },
  { id:"mx-p", brand:"Maxine", name:"Razas Pequeñas", label:"P",  color:"#9A2A80", weight:"21 kg / 7.5 kg",          desc:"Adultos razas pequeñas",             image:"/images/p04.jpg" },
  { id:"lg-c", brand:"Lager",  name:"Cachorros",      label:"C",  color:"#6AAE18", weight:"22 kg / 10 kg",           desc:"Para cachorros de todas las razas",  image:"/images/p09.jpg" },
  { id:"lg-a", brand:"Lager",  name:"Adultos",        label:"A",  color:"#D07010", weight:"22+3 kg gratis / 10 kg",  desc:"Para perros adultos",                image:"/images/p12.jpg" },
  { id:"lg-s", brand:"Lager",  name:"Senior 7+",      label:"S",  color:"#223A88", weight:"22 kg / 10 kg",           desc:"Para perros mayores de 7 años",      image:"/images/p07.jpg" },
  { id:"lg-p", brand:"Lager",  name:"Razas Pequeñas", label:"P",  color:"#008A80", weight:"22 kg / 10 kg",           desc:"Adultos razas pequeñas",             image:"/images/p08.jpg" },
];

const gatos: Product[] = [
  { id:"mx-g",  brand:"Maxine", name:"Gatos",           label:"G",  color:"#2878B8", weight:"21 kg / 7.5 kg", desc:"Para gatos adultos",                       image:"/images/p05.jpg" },
  { id:"mx-gc", brand:"Maxine", name:"Gatos Castrados", label:"GC", color:"#C02888", weight:"21 kg / 7.5 kg", desc:"Para gatos castrados adultos",              image:"/images/p06.jpg" },
  { id:"lg-g",  brand:"Lager",  name:"Gatos",           label:"G",  color:"#B81870", weight:"22 kg / 10 kg",  desc:"Para gatos adultos — mix salmón y carne",   image:"/images/p10.jpg" },
  { id:"lg-gc", brand:"Lager",  name:"Gatos Castrados", label:"GC", color:"#702480", weight:"22 kg / 10 kg",  desc:"Para gatos castrados — mix salmón y pollo", image:"/images/p11.jpg" },
];

// ── Icons ─────────────────────────────────────────────────────────────────────

const IgIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <circle cx="12" cy="12" r="4"/>
    <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
  </svg>
);

const WaIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

// ── Drip Divider ─────────────────────────────────────────────────────────────
// Banda plana (rect) + gotas tipo "lollipop": lados cóncavos + círculo sólido abajo.
// Cada gota es C1-continua con la banda (tangente horizontal en la unión).
// k = constante mágica para aproximar círculo con bezier cúbico.

function DripDivider({ fromColor, toColor = "#FFFFFF" }: { fromColor: string; toColor?: string }) {
  const W = 1440, bY = 52, k = 0.5523;

  // [cx, hwTop (semi-ancho en la banda), blobR (radio círculo), blobCY (centro Y del círculo)]
  const drops: [number, number, number, number][] = [
    [ 130,  62, 46, 110],
    [ 345,  54, 40,  97],
    [ 570,  70, 52, 118],
    [ 785,  48, 36,  92],
    [1008,  66, 49, 113],
    [1215,  56, 41, 100],
    [1378,  44, 32,  86],
  ];

  const maxY = Math.max(...drops.map(([,, bR, bCY]) => bCY + bR)) + 10;

  // Cada gota: lados con S-curve (horizontal en la banda → vertical en tangente del círculo)
  // + círculo completo en el fondo con bezier de precisión.
  const makeDrip = ([cx, hwT, bR, bCY]: [number,number,number,number]) => {
    const x1 = cx - hwT, x2 = cx + hwT;
    return [
      `M ${x1},${bY}`,
      // Lado izquierdo: arranca horizontal (C1 con banda), curva cóncava, llega vertical al círculo
      `C ${cx - hwT * 0.88},${bY}  ${cx - bR},${bCY - bR * 0.35}  ${cx - bR},${bCY}`,
      // Arco inferior izquierdo
      `C ${cx - bR},${bCY + bR * k}  ${cx - bR * k},${bCY + bR}  ${cx},${bCY + bR}`,
      // Arco inferior derecho
      `C ${cx + bR * k},${bCY + bR}  ${cx + bR},${bCY + bR * k}  ${cx + bR},${bCY}`,
      // Lado derecho: simétrico — arranca vertical del círculo, sale horizontal a la banda
      `C ${cx + bR},${bCY - bR * 0.35}  ${cx + hwT * 0.88},${bY}  ${x2},${bY}`,
      `Z`,
    ].join(" ");
  };

  return (
    <div style={{ display:"block", lineHeight:0, backgroundColor: toColor, position:"relative", zIndex:5 }}>
      <svg
        viewBox={`0 0 ${W} ${maxY}`}
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width:"100%", height:`clamp(80px,${((maxY / W) * 100).toFixed(2)}vw,${maxY}px)`, display:"block", marginTop:"-1px" }}
        aria-hidden
      >
        {/* Banda plana */}
        <rect x="0" y="0" width={W} height={bY} fill={fromColor}/>
        {/* Gotas */}
        {drops.map((d, i) => <path key={i} d={makeDrip(d)} fill={fromColor}/>)}
      </svg>
    </div>
  );
}

// ── Weight label — splits "21+4 kg gratis / 7.5 kg" into stacked lines ────────

function WeightLabel({ weight }: { weight: string }) {
  const sizes = weight.split(" / ");
  return (
    <div className="flex flex-col gap-1">
      {sizes.map((size) => {
        const hasGratis = size.includes("gratis");
        const base = size.replace(" gratis", "").trim();
        return (
          <div key={size} className="flex items-center gap-1.5">
            <span className="text-xs font-semibold" style={{ color:"#9C7050" }}>{base}</span>
            {hasGratis && (
              <span className="inline-flex items-center justify-center text-[9px] font-bold uppercase tracking-wide rounded-full px-1.5 py-0.5 leading-none"
                    style={{ backgroundColor:"#E87010", color:"#fff", minWidth:"36px" }}>
                gratis
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Product card ──────────────────────────────────────────────────────────────

function ProductCard({ p }: { p: Product }) {
  const msg = `Hola GoPet! Quiero consultar sobre ${p.brand} ${p.name} (${p.weight}). ¿Está disponible?`;
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
          <svg viewBox="0 0 24 24" fill="black" className="w-5 h-5 mb-1" aria-hidden>
            <path d="M7 2v2H5C3.9 4 3 4.9 3 6v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0011 14.9V17H9v2h6v-2h-2v-2.1a5.01 5.01 0 003.61-2.96C19.08 11.63 21 9.55 21 7V6c0-1.1-.9-2-2-2h-2V2H7zm0 4h10v1c0 1.65-1.35 3-3 3h-4C8.35 10 7 8.65 7 7V6zm-2 0h2v1c0 .35.03.69.08 1.03C5.9 7.7 5 6.94 5 6zm14 0h2c0 .94-.9 1.7-2.08 2.03.05-.34.08-.68.08-1.03V6z"/>
          </svg>
          <span className="font-black text-black leading-none" style={{ fontSize:"9px", letterSpacing:"0.03em", textAlign:"center", lineHeight:1.1 }}>MÁS{"\n"}VENDIDO</span>
        </div>
      )}
      <div className="relative h-48 flex items-center justify-center overflow-hidden" style={{ backgroundColor:"#FFFBF6" }}>
        <Image src={p.image} alt={`${p.brand} ${p.name}`} fill className="object-contain p-3"
               sizes="(max-width:640px) 50vw,(max-width:1024px) 33vw,25vw"/>
        <span className="absolute top-2 left-2 text-xs font-heading font-bold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: p.color }}>
          {p.brand}
        </span>
      </div>
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div>
          <h3 className="font-heading font-bold text-base leading-tight" style={{ color:"#3D2010" }}>{p.name}</h3>
          <p className="text-xs mt-0.5" style={{ color:"#9C7050" }}>{p.desc}</p>
        </div>
        <div className="mt-auto flex items-center justify-between">
          <WeightLabel weight={p.weight} />
          <a href={waURL(msg)} target="_blank" rel="noopener noreferrer"
             className="inline-flex items-center gap-1.5 text-xs font-heading font-bold px-3 py-2 rounded-lg text-white transition-opacity hover:opacity-90 cursor-pointer"
             style={{ backgroundColor:"#E87010" }}>
            <WaIcon className="w-3.5 h-3.5"/>
            Pedir
          </a>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Landing() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"perros"|"gatos">("perros");
  const generalWA = waURL("Hola GoPet! Quiero hacer un pedido.");

  return (
    <>
      {/* ══ NAVBAR ══ */}
      <header className="fixed top-0 left-0 right-0 z-50 text-white" style={{ backgroundColor:"#3D2010", borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-1.5 font-heading font-black text-xl tracking-tight">
            <span style={{ color:"#FFB347" }}>Go</span>
            <span style={{ color:"#FF6B6B" }}>Pet</span>
            <PawPrint className="w-4 h-4" style={{ color:"#FF6B6B" }}/>
          </a>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-white/60">
            <a href="#como-funciona" className="hover:text-white transition-colors">Cómo funciona</a>
            <a href="#productos"     className="hover:text-white transition-colors">Productos</a>
            <a href="#beneficios"    className="hover:text-white transition-colors">Beneficios</a>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <a href={igURL} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-2 text-sm font-medium text-white/60 hover:text-white transition-colors">
              <IgIcon className="w-4 h-4"/> @{IG_HANDLE}
            </a>
            <a href={generalWA} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#25D366] text-white text-sm font-heading font-bold hover:bg-[#1eba58] transition-colors cursor-pointer">
              <WaIcon className="w-4 h-4"/> Pedir ahora
            </a>
          </div>

          <button className="md:hidden p-2 cursor-pointer" onClick={() => setMobileOpen(v=>!v)} aria-label="Abrir menú">
            {mobileOpen ? <X className="w-5 h-5"/> : <Menu className="w-5 h-5"/>}
          </button>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }} exit={{ opacity:0, height:0 }}
                        className="md:hidden overflow-hidden" style={{ backgroundColor:"#3D2010", borderTop:"1px solid rgba(255,255,255,0.08)" }}>
              <div className="px-6 py-4 flex flex-col gap-4">
                <a href="#como-funciona" onClick={()=>setMobileOpen(false)} className="text-white/70 hover:text-white text-sm font-medium">Cómo funciona</a>
                <a href="#productos"     onClick={()=>setMobileOpen(false)} className="text-white/70 hover:text-white text-sm font-medium">Productos</a>
                <a href="#beneficios"    onClick={()=>setMobileOpen(false)} className="text-white/70 hover:text-white text-sm font-medium">Beneficios</a>
                <a href={generalWA} target="_blank" rel="noopener noreferrer"
                   className="flex items-center justify-center gap-2 py-3 rounded-full bg-[#25D366] text-white font-heading font-bold text-sm">
                  <WaIcon className="w-4 h-4"/> Pedir ahora
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main>
        {/* ══════════════════════════════════════════════════════
            HERO — imagen de fondo full-screen
            Guardar imagen en: site/public/images/hero-bg.jpg
        ══════════════════════════════════════════════════════ */}
        <section className="relative min-h-screen text-white overflow-hidden flex flex-col justify-end"
                 style={{ backgroundImage:"url('/images/hero-bg.jpg')", backgroundSize:"cover", backgroundPosition:"center bottom", backgroundColor:"#3D2010" }}>
          <div className="absolute inset-0 pointer-events-none" style={{
            background:"linear-gradient(to bottom, rgba(61,32,16,0.3) 0%, rgba(61,32,16,0.05) 35%, rgba(61,32,16,0.55) 65%, rgba(61,32,16,0.96) 100%)"
          }}/>

          <div className="relative z-10 max-w-6xl mx-auto w-full px-6 pb-20 pt-32">
            <motion.div initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.7, ease:[0.25,1,0.5,1] }} className="max-w-2xl">
              <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full text-xs text-white/70"
                   style={{ border:"1px solid rgba(255,255,255,0.2)", backgroundColor:"rgba(0,0,0,0.25)", backdropFilter:"blur(8px)" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-[#25D366]"/>
                Uruguay · Envío gratis a domicilio
              </div>

              <h1 className="font-heading font-black leading-[0.88] tracking-tighter mb-5 text-[clamp(3.2rem,8vw,6.5rem)]">
                La Ración<br/>Que Tu<br/>
                Mascota<br/>
                <span style={{ color:"#FFB347" }}>Merece.</span>
              </h1>

              <p className="text-white/65 text-lg max-w-md mb-8 leading-relaxed">
                Alimento premium Maxine y Lager — Agrofeed Uruguay. Envío gratis a domicilio. Todo por WhatsApp.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-10">
                <a href={generalWA} target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-full bg-[#25D366] text-white font-heading font-bold text-base hover:bg-[#1eba58] transition-colors cursor-pointer shadow-lg shadow-black/30">
                  <WaIcon className="w-5 h-5"/> Hacer un pedido
                </a>
                <a href="#productos"
                   className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full border border-white/25 bg-black/20 text-white font-heading font-bold text-base hover:bg-black/40 transition-colors cursor-pointer" style={{ backdropFilter:"blur(8px)" }}>
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
        <section style={{ backgroundColor:"#FEF9E7", borderTop:"1px solid #F5E6B0", borderBottom:"1px solid #F5E6B0" }}>
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3" style={{}}>
              {[
                { icon:<Zap className="w-4 h-4" style={{ color:"#E87010" }}/>,       bg:"#FDE8C8", title:"Entrega express",        desc:"Coordinamos la entrega en tu horario. Gratis, siempre." },
                { icon:<ShieldCheck className="w-4 h-4" style={{ color:"#C20808" }}/>, bg:"#FAD0D0", title:"Marcas de confianza",    desc:"Maxine y Lager · Agrofeed Uruguay. Calidad comprobada." },
                { icon:<Leaf className="w-4 h-4" style={{ color:"#2D9B4A" }}/>,        bg:"#C8F0D8", title:"Asesoría personalizada", desc:"Te ayudamos a elegir la ración correcta. Por WhatsApp." },
              ].map((f, i, arr) => (
                <div key={i} className="flex items-center gap-4 px-8 py-7"
                     style={{ borderRight: i < arr.length - 1 ? "1px solid #F5E6B0" : "none" }}>
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
            PRODUCT SPOTLIGHT — salmón muy claro
            La bolsa usa mix-blend-mode:multiply → fondo desaparece
            Container: 896×560px · viewBox 0 0 896 560
        ══════════════════════════════════════════════════════ */}
        <section className="py-24 px-6 overflow-hidden" style={{ backgroundColor:"#FFF5EE" }}>
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
            <div className="lg:hidden flex flex-col items-center gap-8 mt-4">
              <div className="relative" style={{ width:"200px", height:"280px" }}>
                <div style={{ position:"absolute", inset:0, mixBlendMode:"multiply" as const }}>
                  <Image src="/images/maxine-adulto.png" alt="Maxine Adultos 21 kg" fill className="object-contain" sizes="200px"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5 w-full max-w-xs">
                {[["Agrofeed Uruguay","Marca nacional"],["Super Premium","Alta calidad"],["Pollo y Arroz","Proteína natural"],
                  ["High Performance","Máximo rendimiento"],["Razas Adultas","1 a 7 años"],["21+4 kg gratis","Gran bolsa"]].map(([label, sub]) => (
                  <div key={label} className="rounded-2xl p-3 text-center" style={{ border:"1px solid #E8C8A8", backgroundColor:"rgba(255,255,255,0.7)" }}>
                    <p className="font-heading font-bold text-xs" style={{ color:"#3D2010" }}>{label}</p>
                    <p className="text-[10px]" style={{ color:"#9C7050" }}>{sub}</p>
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

        <DripDivider fromColor="#FFF5EE" toColor="#FFFFFF"/>

        {/* ══════════════════════════════════════════════════════
            PRODUCTOS — blanco limpio
        ══════════════════════════════════════════════════════ */}
        <section id="productos" className="py-24 px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="mb-10">
              <h2 className="font-heading font-black text-[clamp(2rem,5vw,3.5rem)] tracking-tighter mb-2" style={{ color:"#3D2010" }}>
                Productos 🐶🐱
              </h2>
              <p style={{ color:"#9C7050" }}>Marcas Maxine y Lager — Agrofeed Uruguay</p>
            </div>

            <div className="flex gap-2 mb-8">
              {(["perros","gatos"] as const).map((tab) => (
                <button key={tab} onClick={()=>setActiveTab(tab)}
                  className="px-5 py-2.5 rounded-full font-heading font-bold text-sm transition-all cursor-pointer capitalize"
                  style={activeTab===tab ? { backgroundColor:"#E87010", color:"#fff" } : { backgroundColor:"#FEE8D0", color:"#9C7050" }}>
                  {tab==="perros" ? "🐶 Perros" : "🐱 Gatos"}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-12 }}
                          transition={{ duration:0.25, ease:[0.25,1,0.5,1] }}
                          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {(activeTab==="perros" ? perros : gatos).map((p) => <ProductCard key={p.id} p={p}/>)}
              </motion.div>
            </AnimatePresence>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            PROMO LAGER ADULTO
        ══════════════════════════════════════════════════════ */}
        <section className="relative overflow-hidden" style={{ backgroundColor:"#1A0F00" }}>
          {/* Imagen de fondo full-bleed — máxima calidad */}
          <div className="absolute inset-0">
            <Image
              src="/images/promo-lager.png"
              alt="Lager Adulto 22+3 kg promoción"
              fill
              className="object-cover object-center"
              sizes="100vw"
              quality={100}
              priority
            />
            {/* Gradiente sobre la imagen para legibilidad */}
            <div className="absolute inset-0" style={{
              background:"linear-gradient(to right, rgba(20,10,0,0.82) 0%, rgba(20,10,0,0.45) 45%, rgba(20,10,0,0.15) 100%)"
            }}/>
          </div>

          <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 lg:py-28 flex flex-col lg:flex-row items-center lg:items-end justify-between gap-10">

            {/* Copy izquierdo */}
            <motion.div initial={{ opacity:0, x:-30 }} whileInView={{ opacity:1, x:0 }}
                        viewport={{ once:true }} transition={{ duration:0.6, ease:[0.25,1,0.5,1] }}
                        className="max-w-lg">

              {/* Badge marca */}
              <div className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest"
                   style={{ backgroundColor:"rgba(232,112,16,0.25)", border:"1px solid rgba(232,112,16,0.5)", color:"#FFB347" }}>
                🐾 Oferta especial
              </div>

              <h2 className="font-heading font-black leading-[0.9] tracking-tighter text-white mb-3"
                  style={{ fontSize:"clamp(2.8rem,7vw,5.5rem)" }}>
                Lager<br/>
                <span style={{ color:"#F5A623" }}>Adulto</span>
              </h2>

              <div className="inline-flex items-center gap-3 mb-5 px-4 py-2 rounded-full"
                   style={{ backgroundColor:"rgba(255,255,255,0.12)", border:"1px solid rgba(255,255,255,0.2)" }}>
                <span className="font-heading font-black text-white text-xl">22 + 3 kg</span>
                <span className="text-white/50 text-sm">gratis</span>
              </div>

              <p className="text-white/70 text-lg mb-8 leading-relaxed max-w-xs">
                ¡Al mejor precio del mercado! Alimento premium para perros adultos.
              </p>

              {/* Bloque de precios */}
              <div className="flex items-end gap-4 mb-8">
                <div className="flex flex-col">
                  <span className="text-white/40 text-sm font-medium mb-0.5">Antes</span>
                  <span className="font-heading font-bold text-2xl text-white/40 line-through decoration-red-400">
                    $2.140
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold uppercase tracking-widest mb-0.5" style={{ color:"#4ADE80" }}>Ahora</span>
                  <span className="font-heading font-black leading-none" style={{ fontSize:"clamp(3rem,6vw,4.5rem)", color:"#FFFFFF" }}>
                    $1.850
                  </span>
                </div>
                <div className="mb-2 px-2 py-1 rounded-lg text-xs font-bold" style={{ backgroundColor:"#C20808", color:"#fff" }}>
                  13% OFF
                </div>
              </div>

              {/* Envíos gratis + CTA */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <a href={waURL("Hola GoPet! Quiero aprovechar la promo de Lager Adulto 22+3 kg a $1.850. ¿Está disponible?")}
                   target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center gap-2.5 px-7 py-4 rounded-2xl text-white font-heading font-black text-base hover:opacity-90 transition-opacity cursor-pointer shadow-lg"
                   style={{ backgroundColor:"#25D366", boxShadow:"0 8px 32px rgba(37,211,102,0.35)" }}>
                  <WaIcon className="w-5 h-5"/> Pedir esta promo
                </a>
                <div className="flex items-center gap-2 px-4 py-3 rounded-2xl"
                     style={{ backgroundColor:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)" }}>
                  <span className="text-lg">🚚</span>
                  <span className="font-heading font-bold text-white text-sm">Envío gratis</span>
                </div>
              </div>
            </motion.div>

            {/* Espacio derecho — la imagen de fondo lo llena visualmente */}
            <div className="hidden lg:block w-[380px] h-[380px]"/>
          </div>
        </section>

        <DripDivider fromColor="#1A0F00" toColor="#EFF9FF"/>

        {/* ══════════════════════════════════════════════════════
            CÓMO FUNCIONA — celeste bebé
        ══════════════════════════════════════════════════════ */}
        <section id="como-funciona" className="py-24 px-6" style={{ backgroundColor:"#EFF9FF" }}>
          <div className="max-w-6xl mx-auto">
            <div className="mb-14">
              <h2 className="font-heading font-black text-[clamp(2rem,5vw,3.5rem)] tracking-tighter mb-2" style={{ color:"#1A6FA0" }}>
                Cómo funciona 🐾
              </h2>
              <p style={{ color:"#4A90B8" }}>Tres pasos, sin complicaciones.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { n:"01", title:"Elegís tu ración",     desc:"Mirá nuestro catálogo y elegí el alimento que mejor le va a tu mascota.", emoji:"🦴" },
                { n:"02", title:"Pedís por WhatsApp",   desc:"Nos mandás un mensaje con tu pedido. Te respondemos al toque.", emoji:"💬" },
                { n:"03", title:"Recibís en tu puerta", desc:"Envío gratis y rápido. Coordinamos el horario que más te convenga.", emoji:"🏠" },
              ].map((step, i) => (
                <motion.div key={step.n} initial={{ opacity:0, y:24 }} whileInView={{ opacity:1, y:0 }}
                            viewport={{ once:true }} transition={{ duration:0.45, delay:i*0.1, ease:[0.25,1,0.5,1] }}
                            className="flex flex-col gap-3 p-6 rounded-3xl" style={{ backgroundColor:"#FFFFFF", border:"1px solid #C8E8F8", boxShadow:"0 4px 20px rgba(26,111,160,0.08)" }}>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{step.emoji}</span>
                    <span className="font-heading font-black text-4xl leading-none" style={{ color:"rgba(26,111,160,0.18)" }}>{step.n}</span>
                  </div>
                  <h3 className="font-heading font-bold text-xl" style={{ color:"#1A6FA0" }}>{step.title}</h3>
                  <p className="leading-relaxed" style={{ color:"#4A90B8" }}>{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <DripDivider fromColor="#EFF9FF" toColor="#F0FFF6"/>

        {/* ══════════════════════════════════════════════════════
            BENEFICIOS — verde menta suave
        ══════════════════════════════════════════════════════ */}
        <section id="beneficios" className="py-24 px-6" style={{ backgroundColor:"#F0FFF6" }}>
          <div className="max-w-6xl mx-auto">
            <div className="mb-14">
              <h2 className="font-heading font-black text-[clamp(2rem,5vw,3.5rem)] tracking-tighter mb-2" style={{ color:"#1A7A40" }}>
                ¿Por qué GoPet? 💚
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { emoji:"🚚", icon:<Truck className="w-5 h-5"/>,      color:"#25A244", bg:"#C8F0D8", title:"Envío gratis y rápido",      desc:"Coordinamos la entrega en el horario que mejor te quede. Sin costo extra." },
                { emoji:"🏷️", icon:<Tag className="w-5 h-5"/>,        color:"#E87010", bg:"#FDE8C8", title:"Los mejores precios",        desc:"Sin intermediarios, sin locales caros. El precio justo para vos y tu mascota." },
                { emoji:"❤️", icon:<Heart className="w-5 h-5"/>,      color:"#E84060", bg:"#FFD0DC", title:"Seguimiento de tu mascota",  desc:"Te ayudamos a elegir la ración correcta según la edad y raza de tu mascota." },
                { emoji:"🎧", icon:<Headphones className="w-5 h-5"/>, color:"#1A6FA0", bg:"#C8E8F8", title:"Atención personalizada",     desc:"Respondemos rápido. Consultas, pedidos y soporte — todo por WhatsApp." },
              ].map((b, i) => (
                <motion.div key={b.title} initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }}
                            viewport={{ once:true }} transition={{ duration:0.4, delay:i*0.08, ease:[0.25,1,0.5,1] }}
                            className="bg-white rounded-3xl p-6 flex flex-col gap-4"
                            style={{ border:"1px solid #B8EFD0", boxShadow:"0 4px 20px rgba(26,122,64,0.08)" }}>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl" style={{ backgroundColor:b.bg }}>
                    {b.emoji}
                  </div>
                  <h3 className="font-heading font-bold text-base" style={{ color:b.color }}>{b.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color:"#4A8060" }}>{b.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <DripDivider fromColor="#F0FFF6" toColor="#FEF9E7"/>

        {/* ══════════════════════════════════════════════════════
            MINIJUEGO — perro come raciones
        ══════════════════════════════════════════════════════ */}
        <section className="py-24 px-6" style={{ backgroundColor:"#FEF9E7" }}>
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

        <DripDivider fromColor="#FEF9E7" toColor="#E87010"/>

        {/* ══════════════════════════════════════════════════════
            CTA FINAL — naranja cálido y juguetón
        ══════════════════════════════════════════════════════ */}
        <section className="py-28 px-6 text-white" style={{ backgroundColor:"#E87010" }}>
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
        <footer className="py-8 px-6 text-white/50" style={{ backgroundColor:"#3D2010" }}>
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
    </>
  );
}
