"use client";

import { useState } from "react";
import Image from "next/image";
import { PawPrint, Truck, Tag, Heart, Headphones, ChevronRight, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const WA_NUMBER = "59892360472";
const IG_HANDLE = "gopet_uy";

const waURL = (msg: string) =>
  `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;

const igURL = `https://www.instagram.com/${IG_HANDLE}`;

// ── Product data ──────────────────────────────────────────────────────────────

type Product = {
  id: string;
  brand: "Maxine" | "Lager";
  name: string;
  label: string;
  color: string;
  textColor: string;
  weight: string;
  desc: string;
  image: string;
};

const perros: Product[] = [
  { id: "mx-c", brand: "Maxine", name: "Cachorros", label: "C", color: "#E87010", textColor: "#fff", weight: "21 kg", desc: "Para cachorros de todas las razas", image: "/images/p01.jpg" },
  { id: "mx-a", brand: "Maxine", name: "Adultos", label: "A", color: "#C20808", textColor: "#fff", weight: "21 kg", desc: "Para perros adultos", image: "/images/p02.jpg" },
  { id: "mx-s", brand: "Maxine", name: "Senior", label: "S", color: "#4E9A1A", textColor: "#fff", weight: "21 kg", desc: "Para perros mayores de 7 años", image: "/images/p03.jpg" },
  { id: "mx-p", brand: "Maxine", name: "Razas Pequeñas", label: "P", color: "#9A2A80", textColor: "#fff", weight: "21 kg", desc: "Adultos razas pequeñas", image: "/images/p04.jpg" },
  { id: "lg-c", brand: "Lager", name: "Cachorros", label: "C", color: "#6AAE18", textColor: "#fff", weight: "22 kg", desc: "Para cachorros de todas las razas", image: "/images/p09.jpg" },
  { id: "lg-a", brand: "Lager", name: "Adultos", label: "A", color: "#D07010", textColor: "#fff", weight: "22 kg", desc: "Para perros adultos", image: "/images/p12.jpg" },
  { id: "lg-s", brand: "Lager", name: "Senior 7+", label: "S", color: "#223A88", textColor: "#fff", weight: "22 kg", desc: "Para perros mayores de 7 años", image: "/images/p07.jpg" },
  { id: "lg-p", brand: "Lager", name: "Razas Pequeñas", label: "P", color: "#008A80", textColor: "#fff", weight: "22 kg", desc: "Adultos razas pequeñas", image: "/images/p08.jpg" },
];

const gatos: Product[] = [
  { id: "mx-g", brand: "Maxine", name: "Gatos", label: "G", color: "#2878B8", textColor: "#fff", weight: "21 kg", desc: "Para gatos adultos", image: "/images/p05.jpg" },
  { id: "mx-gc", brand: "Maxine", name: "Gatos Castrados", label: "GC", color: "#C02888", textColor: "#fff", weight: "21 kg", desc: "Para gatos castrados adultos", image: "/images/p06.jpg" },
  { id: "lg-g", brand: "Lager", name: "Gatos", label: "G", color: "#B81870", textColor: "#fff", weight: "22 kg", desc: "Para gatos adultos — mix salmón y carne", image: "/images/p10.jpg" },
  { id: "lg-gc", brand: "Lager", name: "Gatos Castrados", label: "GC", color: "#702480", textColor: "#fff", weight: "22 kg", desc: "Para gatos castrados — mix salmón y pollo", image: "/images/p11.jpg" },
];

// ── WhatsApp icon ─────────────────────────────────────────────────────────────

const IgIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
  </svg>
);

const WaIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

// ── Product card ──────────────────────────────────────────────────────────────

function ProductCard({ p }: { p: Product }) {
  const msg = `Hola GoPet! Quiero consultar sobre ${p.brand} ${p.name} (${p.weight}). ¿Está disponible?`;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
      className="rounded-2xl overflow-hidden border border-border bg-card flex flex-col hover:shadow-md transition-shadow"
    >
      {/* Product image */}
      <div className="relative h-48 bg-white flex items-center justify-center overflow-hidden">
        <Image
          src={p.image}
          alt={`${p.brand} ${p.name}`}
          fill
          className="object-contain p-3"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
        <span
          className="absolute top-2 left-2 text-xs font-heading font-bold px-2 py-0.5 rounded-full text-white"
          style={{ backgroundColor: p.color }}
        >
          {p.brand}
        </span>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div>
          <h3 className="font-heading font-bold text-base leading-tight">{p.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
        </div>
        <div className="mt-auto flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground">{p.weight}</span>
          <a
            href={waURL(msg)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-heading font-bold px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
          >
            <WaIcon className="w-3.5 h-3.5" />
            Pedir
          </a>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Landing() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"perros" | "gatos">("perros");

  const generalWA = waURL("Hola GoPet! Quiero hacer un pedido.");

  return (
    <>
      {/* ── NAVBAR ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#111111] text-white">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <a href="/" className="flex items-center gap-1.5 font-heading font-black text-xl tracking-tight">
            <span className="text-white">Go</span>
            <span className="text-primary">Pet</span>
            <PawPrint className="w-4 h-4 text-primary" />
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-white/70">
            <a href="#como-funciona" className="hover:text-white transition-colors">Cómo funciona</a>
            <a href="#productos" className="hover:text-white transition-colors">Productos</a>
            <a href="#beneficios" className="hover:text-white transition-colors">Beneficios</a>
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href={igURL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-medium text-white/70 hover:text-white transition-colors"
            >
              <IgIcon className="w-4 h-4" />
              @{IG_HANDLE}
            </a>
            <a
              href={generalWA}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#25D366] text-white text-sm font-heading font-bold hover:bg-[#1eba58] transition-colors cursor-pointer"
            >
              <WaIcon className="w-4 h-4" />
              Pedir ahora
            </a>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 cursor-pointer"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Abrir menú"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-white/10 bg-[#111111] overflow-hidden"
            >
              <div className="px-6 py-4 flex flex-col gap-4">
                <a href="#como-funciona" onClick={() => setMobileOpen(false)} className="text-white/70 hover:text-white text-sm font-medium">Cómo funciona</a>
                <a href="#productos" onClick={() => setMobileOpen(false)} className="text-white/70 hover:text-white text-sm font-medium">Productos</a>
                <a href="#beneficios" onClick={() => setMobileOpen(false)} className="text-white/70 hover:text-white text-sm font-medium">Beneficios</a>
                <a
                  href={generalWA}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-3 rounded-full bg-[#25D366] text-white font-heading font-bold text-sm"
                >
                  <WaIcon className="w-4 h-4" />
                  Pedir ahora
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main>
        {/* ── HERO ── */}
        <section className="min-h-screen bg-[#111111] text-white flex flex-col justify-center px-6 pt-16 relative overflow-hidden">
          {/* Decorative background text */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden" aria-hidden="true">
            <span className="font-heading font-black text-[22vw] leading-none opacity-[0.04] tracking-tighter whitespace-nowrap text-white">
              GOPET
            </span>
          </div>

          <div className="max-w-6xl mx-auto w-full relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1] }}
            >
              <div className="inline-flex items-center gap-2 mb-8 px-3 py-1.5 rounded-full border border-white/15 bg-white/5 text-xs text-white/60">
                <span className="w-2 h-2 rounded-full bg-[#25D366]" aria-hidden="true" />
                Uruguay · Envío gratis a domicilio
              </div>

              <h1 className="font-heading font-black leading-[0.88] tracking-tighter mb-6 text-[clamp(3.5rem,12vw,8.5rem)]">
                Tu Ración
                <br />
                <span className="text-primary">Al Instante.</span>
              </h1>

              <p className="text-white/55 text-lg max-w-md mb-10 leading-relaxed">
                Alimento de calidad para tu mascota. Sin salir de casa, sin pagar de más.
                Directo por WhatsApp.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href={generalWA}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-3 px-7 py-4 rounded-full bg-[#25D366] text-white font-heading font-bold text-lg hover:bg-[#1eba58] transition-colors cursor-pointer"
                >
                  <WaIcon className="w-5 h-5" />
                  Hacer un pedido
                </a>
                <a
                  href="#productos"
                  className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full border border-white/20 text-white font-heading font-bold text-lg hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Ver productos
                  <ChevronRight className="w-5 h-5" />
                </a>
              </div>
            </motion.div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30" aria-hidden="true">
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
              className="w-px h-8 bg-white/20"
            />
          </div>
        </section>

        {/* ── CÓMO FUNCIONA ── */}
        <section id="como-funciona" className="py-24 px-6 bg-muted/50">
          <div className="max-w-6xl mx-auto">
            <div className="mb-14">
              <h2 className="font-heading font-black text-[clamp(2rem,5vw,3.5rem)] tracking-tighter">
                Cómo funciona
              </h2>
              <p className="text-muted-foreground mt-2">Tres pasos, sin complicaciones.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  n: "01",
                  title: "Elegís tu ración",
                  desc: "Mirá nuestro catálogo y elegí el alimento que mejor le va a tu mascota.",
                },
                {
                  n: "02",
                  title: "Pedís por WhatsApp",
                  desc: "Nos mandás un mensaje con tu pedido. Te respondemos al toque.",
                },
                {
                  n: "03",
                  title: "Recibís en tu puerta",
                  desc: "Envío gratis y rápido. Coordinamos el horario que más te convenga.",
                },
              ].map((step, i) => (
                <motion.div
                  key={step.n}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: i * 0.1, ease: [0.25, 1, 0.5, 1] }}
                  className="flex flex-col gap-4"
                >
                  <span className="font-heading font-black text-6xl text-primary/20 leading-none select-none">
                    {step.n}
                  </span>
                  <h3 className="font-heading font-bold text-xl">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRODUCTOS ── */}
        <section id="productos" className="py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="mb-10">
              <h2 className="font-heading font-black text-[clamp(2rem,5vw,3.5rem)] tracking-tighter">
                Productos
              </h2>
              <p className="text-muted-foreground mt-2">
                Marcas Maxine y Lager — Agrofeed Uruguay
              </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-8">
              {(["perros", "gatos"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2.5 rounded-full font-heading font-bold text-sm transition-all cursor-pointer capitalize ${
                    activeTab === tab
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab === "perros" ? "🐶 Perros" : "🐱 Gatos"}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
              >
                {(activeTab === "perros" ? perros : gatos).map((p) => (
                  <ProductCard key={p.id} p={p} />
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </section>

        {/* ── BENEFICIOS ── */}
        <section id="beneficios" className="py-24 px-6 bg-muted/50">
          <div className="max-w-6xl mx-auto">
            <div className="mb-14">
              <h2 className="font-heading font-black text-[clamp(2rem,5vw,3.5rem)] tracking-tighter">
                ¿Por qué GoPet?
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: <Truck className="w-6 h-6" />,
                  title: "Envío gratis y rápido",
                  desc: "Coordinamos la entrega en el horario que mejor te quede. Sin costo extra.",
                },
                {
                  icon: <Tag className="w-6 h-6" />,
                  title: "Los mejores precios",
                  desc: "Sin intermediarios, sin locales caros. El precio justo para vos y tu mascota.",
                },
                {
                  icon: <Heart className="w-6 h-6" />,
                  title: "Seguimiento de tu mascota",
                  desc: "Te ayudamos a elegir la ración correcta según la edad y raza de tu mascota.",
                },
                {
                  icon: <Headphones className="w-6 h-6" />,
                  title: "Atención personalizada",
                  desc: "Respondemos rápido. Consultas, pedidos y soporte — todo por WhatsApp.",
                },
              ].map((b, i) => (
                <motion.div
                  key={b.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08, ease: [0.25, 1, 0.5, 1] }}
                  className="bg-card rounded-2xl p-6 border border-border flex flex-col gap-4"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    {b.icon}
                  </div>
                  <h3 className="font-heading font-bold text-base">{b.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA DARK ── */}
        <section className="py-28 px-6 bg-primary text-white">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
              className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10"
            >
              <div>
                <h2 className="font-heading font-black text-[clamp(2rem,6vw,4rem)] tracking-tighter leading-[0.9] mb-4">
                  ¿Listo para
                  <br />
                  hacer tu pedido?
                </h2>
                <p className="text-white/70 max-w-sm leading-relaxed">
                  Escribinos ahora. Te respondemos al toque y coordinamos la entrega.
                </p>
              </div>

              <div className="flex flex-col gap-4 w-full lg:w-auto">
                <a
                  href={generalWA}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-white text-foreground font-heading font-black text-lg hover:bg-white/90 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <WaIcon className="w-5 h-5 text-[#25D366]" />
                  Pedir por WhatsApp
                </a>
                <a
                  href={igURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 px-8 py-4 rounded-2xl border border-white/30 text-white font-heading font-bold text-lg hover:bg-white/10 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <IgIcon className="w-5 h-5" />
                  @{IG_HANDLE}
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="py-8 px-6 bg-[#111111] text-white/50">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 font-heading font-black text-white">
              <span>Go</span>
              <span className="text-primary">Pet</span>
              <PawPrint className="w-3.5 h-3.5 text-primary" />
            </div>
            <p className="text-xs text-center">
              Alimento para mascotas · Envío a domicilio · Uruguay
            </p>
            <p className="text-xs">
              Built with Claude Web Builder by{" "}
              <a
                href="https://tododeia.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white/80 underline underline-offset-2"
              >
                Tododeia
              </a>
            </p>
          </div>
        </footer>
      </main>
    </>
  );
}
