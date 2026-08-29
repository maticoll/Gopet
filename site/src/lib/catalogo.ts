// ──────────────────────────────────────────────────────────────────────────────
// Catálogo de productos de la web pública.
//
// Los precios viven acá como número (no como string "$2.870") porque el carrito
// necesita sumarlos. El formato con puntos se arma con formatearPrecio().
//
// OJO: estos precios tienen que coincidir con productos.precio_venta en la base
// (que es de donde saca el precio el bot de Telegram). Si cambian los precios,
// se cambian en los dos lados.
// ──────────────────────────────────────────────────────────────────────────────

export type Variante = {
  /** Cómo se muestra el tamaño en la web. Ej: "21+4 kg" */
  etiqueta: string
  /** Lo que se cobra. Si la bolsa está en oferta, este ya es el precio con descuento. */
  precio: number
  /** true → muestra el sellito "gratis" al lado del tamaño (bolsas con kilos de regalo) */
  gratis?: boolean
  /** Precio de lista cuando la bolsa está en oferta: se muestra tachado al lado. */
  antes?: number
}

export type Producto = {
  id: string
  marca: 'Maxine' | 'Lager'
  nombre: string
  especie: 'perro' | 'gato'
  label: string
  color: string
  desc: string
  imagen: string
  variantes: Variante[]
}

export const perros: Producto[] = [
  { id:'mx-c', marca:'Maxine', nombre:'Cachorros',     especie:'perro', label:'C', color:'#E87010', desc:'Para cachorros de todas las razas', imagen:'/images/p01.png',
    variantes:[{ etiqueta:'21 kg', precio:2870 }, { etiqueta:'7,5 kg', precio:1190 }] },
  { id:'mx-a', marca:'Maxine', nombre:'Adultos',       especie:'perro', label:'A', color:'#C20808', desc:'Para perros adultos', imagen:'/images/p02.png',
    variantes:[{ etiqueta:'21+4 kg', precio:2440, gratis:true }, { etiqueta:'7,5 kg', precio:1090 }] },
  { id:'mx-s', marca:'Maxine', nombre:'Senior',        especie:'perro', label:'S', color:'#4E9A1A', desc:'Para perros mayores de 7 años', imagen:'/images/p03.png',
    variantes:[{ etiqueta:'21 kg', precio:2920 }, { etiqueta:'7,5 kg', precio:1220 }] },
  // Los dos tamaños están con 8% off: se cobra el precio nuevo y se muestra tachado el viejo.
  { id:'mx-p', marca:'Maxine', nombre:'Razas Pequeñas', especie:'perro', label:'P', color:'#9A2A80', desc:'Adultos razas pequeñas', imagen:'/images/p04.png',
    variantes:[{ etiqueta:'21 kg', precio:2750, antes:2990 }, { etiqueta:'7,5 kg', precio:1075, antes:1170 }] },
  { id:'lg-c', marca:'Lager', nombre:'Cachorros',      especie:'perro', label:'C', color:'#6AAE18', desc:'Para cachorros de todas las razas', imagen:'/images/p09.png',
    variantes:[{ etiqueta:'22 kg', precio:2190 }, { etiqueta:'10 kg', precio:1200 }] },
  { id:'lg-a', marca:'Lager', nombre:'Adultos',        especie:'perro', label:'A', color:'#D07010', desc:'Para perros adultos', imagen:'/images/p12.png',
    variantes:[{ etiqueta:'22+3 kg', precio:1940, gratis:true }, { etiqueta:'10 kg', precio:1020 }] },
  { id:'lg-s', marca:'Lager', nombre:'Senior 7+',      especie:'perro', label:'S', color:'#223A88', desc:'Para perros mayores de 7 años', imagen:'/images/p07.png',
    variantes:[{ etiqueta:'22 kg', precio:2140 }, { etiqueta:'10 kg', precio:1190 }] },
  { id:'lg-p', marca:'Lager', nombre:'Razas Pequeñas', especie:'perro', label:'P', color:'#008A80', desc:'Adultos razas pequeñas', imagen:'/images/p08.png',
    variantes:[{ etiqueta:'22 kg', precio:2240 }, { etiqueta:'10 kg', precio:1150 }] },
]

export const gatos: Producto[] = [
  { id:'mx-g',  marca:'Maxine', nombre:'Gatos',           especie:'gato', label:'G',  color:'#2878B8', desc:'Para gatos adultos', imagen:'/images/p05.png',
    variantes:[{ etiqueta:'21 kg', precio:3860 }, { etiqueta:'7,5 kg', precio:1540 }] },
  { id:'mx-gc', marca:'Maxine', nombre:'Gatos Castrados', especie:'gato', label:'GC', color:'#C02888', desc:'Para gatos castrados adultos', imagen:'/images/p06.png',
    variantes:[{ etiqueta:'21 kg', precio:3860 }, { etiqueta:'7,5 kg', precio:1540 }] },
  { id:'lg-g',  marca:'Lager', nombre:'Gatos',            especie:'gato', label:'G',  color:'#B81870', desc:'Para gatos adultos — mix salmón y carne', imagen:'/images/p10.png',
    variantes:[{ etiqueta:'22 kg', precio:2580 }, { etiqueta:'10 kg', precio:1340 }] },
  { id:'lg-gc', marca:'Lager', nombre:'Gatos Castrados',  especie:'gato', label:'GC', color:'#702480', desc:'Para gatos castrados — mix salmón y pollo', imagen:'/images/p11.png',
    variantes:[{ etiqueta:'22 kg', precio:2740 }, { etiqueta:'10 kg', precio:1530 }] },
]

/**
 * Combos: no se muestran en el grid (son las promos de la landing) pero sí van
 * en `catalogo`, así el carrito los resuelve como a cualquier otra bolsa y el
 * precio de promo llega hasta el mensaje de WhatsApp.
 */
export const combos: Producto[] = [
  { id:'lg-a-promo', marca:'Lager', nombre:'Promo Adultos', especie:'perro', label:'A', color:'#D07010', desc:'La bolsa de 22+3 kg y la de 10 kg juntas', imagen:'/images/p12.png',
    variantes:[{ etiqueta:'22+13 kg', precio:2450 }] },
]

export const catalogo: Producto[] = [...perros, ...gatos, ...combos]

export function buscarProducto(id: string): Producto | undefined {
  return catalogo.find(p => p.id === id)
}

/** La promo destacada de la landing: las dos bolsas de Lager Adultos juntas. */
const COMBO_LAGER_ADULTO = 'lg-a-promo'
/** Contra esto se compara para mostrar el "antes": las dos bolsas por separado. */
const LAGER_ADULTO = 'lg-a'

/**
 * El combo que se suma al carrito, más el precio de lista y el descuento real.
 * El % y el "antes" se calculan solos: si cambian los precios de las bolsas,
 * la promo se actualiza sola en vez de quedar mostrando números viejos.
 */
export function promoLagerAdulto() {
  const combo = buscarProducto(COMBO_LAGER_ADULTO)
  const suelto = buscarProducto(LAGER_ADULTO)
  const lista = suelto ? suelto.variantes.reduce((acc, v) => acc + v.precio, 0) : 0
  const precio = combo?.variantes[0]?.precio ?? 0
  return {
    combo,
    lista,
    precio,
    off: lista > 0 && precio > 0 ? Math.round((1 - precio / lista) * 100) : 0,
  }
}

/** Cuánto % off tiene una bolsa. 0 si no está en oferta. */
export function descuento(v: Variante): number {
  return v.antes && v.antes > v.precio ? Math.round((1 - v.precio / v.antes) * 100) : 0
}

/** El mayor descuento entre los tamaños de un producto. 0 si ninguno está en oferta. */
export function descuentoProducto(p: Producto): number {
  return p.variantes.reduce((max, v) => Math.max(max, descuento(v)), 0)
}

/** "21+4 kg / 7,5 kg" — para textos donde se listan todos los tamaños juntos. */
export function tamaños(p: Producto): string {
  return p.variantes.map(v => v.etiqueta).join(' / ')
}

/**
 * 2440 → "$2.440". Se arma a mano en vez de con toLocaleString para que el
 * servidor y el browser generen exactamente el mismo string (si no, React
 * tira error de hidratación cuando los locales no coinciden).
 */
export function formatearPrecio(n: number): string {
  return '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}
