'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { calcularFechaFinPerro, calcularFechaFinGato, kilosDeBolsa } from '@/lib/calculations'
import { Button } from '@/components/ui/button'
import { registrarVentaAction, type MascotaVenta } from './nueva-venta-actions'

export interface MascotaOpcion {
  id: string
  nombre: string
  especie: 'perro' | 'gato'
  tipo: string | null
  pesoKg: number | null
  intervaloCompraDias: number | null
  ultimoProducto: string | null
  gramosPorComida: number | null
  vecesAlDia: number | null
}

export interface ClienteOpcion {
  id: string
  nombre: string
  telefono: string | null
  direccion: string | null
  activo: boolean
  mascotas: MascotaOpcion[]
}

export interface ProductoOpcion {
  nombre: string
  marca: string
  precio: number | null
  stockShangrila: number
  stockDepartamento: number
}

type Casa = 'shangrila' | 'departamento'

interface Bolsa {
  id: number
  mascota: string | null   // null = la mascota elegida arriba
  producto: string
  productoOtro: boolean
  tamañoBolsaKg: string
  precio: string
  cantidad: string
}

// Lo que come cada mascota: con eso se calcula cuándo se le termina la comida.
interface Alimentacion {
  gramosPorComida: string
  vecesAlDia: string
  intervaloDias: string
  fechaManual: string
}

// Una mascota a la que se le puede anotar una bolsa en esta venta.
interface MascotaEnVenta {
  key: string              // id de la mascota, o NUEVA
  nombre: string
  especie: 'perro' | 'gato'
}

const OTRO_PRODUCTO = '__otro__'
const NUEVA = '__nueva__'
const MAX_RESULTADOS = 8

const CASA_LABELS: Record<Casa, string> = {
  shangrila:    '🏠 Shangrila',
  departamento: '🏢 Departamento',
}

const TIPO_LABELS: Record<string, string> = {
  adulto:         'Adulto',
  senior:         'Senior',
  cachorro:       'Cachorro',
  'raza_pequeña': 'Raza pequeña',
}

const inputCls = 'w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500'
const selectCls = 'w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-300 text-sm focus:outline-none focus:border-amber-500'

function toggleCls(activo: boolean) {
  return `px-4 py-2 rounded text-sm font-medium transition-colors ${
    activo ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
  }`
}

function normalizar(v: string): string {
  return v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function formatearPrecio(n: number): string {
  return `$${n.toLocaleString('es-UY')}`
}

function bolsasTexto(n: number): string {
  return `${n} bolsa${n !== 1 ? 's' : ''}`
}

function stockEn(p: ProductoOpcion, casa: Casa): number {
  return casa === 'departamento' ? p.stockDepartamento : p.stockShangrila
}

function emoji(especie: 'perro' | 'gato'): string {
  return especie === 'gato' ? '🐱' : '🐶'
}

function bolsaVacia(id: number): Bolsa {
  return { id, mascota: null, producto: '', productoOtro: false, tamañoBolsaKg: '', precio: '', cantidad: '1' }
}

// Cantidad escrita en la bolsa, o null si no es un entero de 1 para arriba.
function cantidadDe(b: Bolsa): number | null {
  const n = Number(b.cantidad)
  return Number.isInteger(n) && n >= 1 ? n : null
}

function alimentacionInicial(m: MascotaOpcion | null): Alimentacion {
  return {
    gramosPorComida: m?.gramosPorComida != null ? String(m.gramosPorComida) : '',
    vecesAlDia:      m?.vecesAlDia != null ? String(m.vecesAlDia) : '2',
    intervaloDias:   m?.intervaloCompraDias != null ? String(m.intervaloCompraDias) : '',
    fechaManual:     '',
  }
}

export function NuevaVentaForm({ clientes, productos }: { clientes: ClienteOpcion[]; productos: ProductoOpcion[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [especieNueva, setEspecieNueva] = useState<'perro' | 'gato'>('perro')
  const [modoCliente, setModoCliente] = useState<'existente' | 'nuevo'>('existente')
  const [clienteId, setClienteId] = useState<string | null>(null)
  const [perroId, setPerroId] = useState<string | null>(null)
  const [mascotaNueva, setMascotaNueva] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [listaAbierta, setListaAbierta] = useState(false)
  const [resaltado, setResaltado] = useState(0)
  const [casa, setCasa] = useState<Casa>('shangrila')
  const [pagado, setPagado] = useState(true)
  const [bolsas, setBolsas] = useState<Bolsa[]>([bolsaVacia(1)])
  // Sólo lo que se tocó a mano; lo demás sale de la última compra de cada mascota.
  const [alimentacion, setAlimentacion] = useState<Record<string, Alimentacion>>({})
  const [form, setForm] = useState({
    clienteNombre: '', clienteTelefono: '', clienteDireccion: '',
    mascotaNombre: '', mascotaPeso: '', tipoPerro: 'adulto',
  })

  function set(field: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  const clienteElegido = clientes.find(c => c.id === clienteId) ?? null
  const mascotaElegida = clienteElegido?.mascotas.find(m => m.id === perroId) ?? null
  const mostrarCamposMascota = modoCliente === 'nuevo'
    || (clienteElegido !== null && (clienteElegido.mascotas.length === 0 || mascotaNueva))

  // Mascotas a las que se les puede anotar una bolsa: las del cliente y, si se
  // está cargando una, la nueva.
  const mascotasDisponibles: MascotaEnVenta[] = [
    ...(clienteElegido?.mascotas ?? []).map(m => ({ key: m.id, nombre: m.nombre, especie: m.especie })),
    ...(mostrarCamposMascota ? [{ key: NUEVA, nombre: form.mascotaNombre.trim() || 'Mascota nueva', especie: especieNueva }] : []),
  ]
  const principal: string | null = mascotaElegida?.id ?? (mostrarCamposMascota ? NUEVA : null)

  function mascotaDe(b: Bolsa): string | null {
    return b.mascota && mascotasDisponibles.some(m => m.key === b.mascota) ? b.mascota : principal
  }

  function alimentacionDe(key: string): Alimentacion {
    return alimentacion[key] ?? alimentacionInicial(clienteElegido?.mascotas.find(m => m.id === key) ?? null)
  }

  function setAlimentacionDe(key: string, field: keyof Alimentacion, value: string) {
    const actual = alimentacionDe(key)
    setAlimentacion(a => ({ ...a, [key]: { ...(a[key] ?? actual), [field]: value } }))
  }

  function productoDeCatalogo(nombre: string | null): ProductoOpcion | undefined {
    if (!nombre) return undefined
    return productos.find(p => p.nombre.toLowerCase() === nombre.trim().toLowerCase())
  }

  // Mascotas que tienen al menos una bolsa, en el orden de las bolsas.
  const mascotasEnUso = [...new Set(bolsas.map(mascotaDe).filter((k): k is string => k !== null))]
    .map(key => mascotasDisponibles.find(m => m.key === key)!)

  // Busca por nombre, teléfono, dirección o nombre de la mascota, sin importar acentos.
  const resultados = useMemo(() => {
    const palabras = normalizar(busqueda).split(/\s+/).filter(Boolean)
    if (!palabras.length) return []
    const q = normalizar(busqueda.trim())
    return clientes
      .filter(c => {
        const texto = normalizar([
          c.nombre, c.telefono ?? '', (c.telefono ?? '').replace(/\D/g, ''), c.direccion ?? '',
          ...c.mascotas.map(m => m.nombre),
        ].join(' '))
        return palabras.every(p => texto.includes(p))
      })
      .sort((a, b) => {
        // Primero los que empiezan con lo escrito, después los activos.
        const ea = normalizar(a.nombre).startsWith(q) ? 0 : 1
        const eb = normalizar(b.nombre).startsWith(q) ? 0 : 1
        if (ea !== eb) return ea - eb
        if (a.activo !== b.activo) return a.activo ? -1 : 1
        return a.nombre.localeCompare(b.nombre)
      })
      .slice(0, MAX_RESULTADOS)
  }, [busqueda, clientes])

  // Productos agrupados por marca y especie, como en la página de Stock.
  const gruposProductos = useMemo(() => {
    const grupos = new Map<string, ProductoOpcion[]>()
    for (const p of productos) {
      const titulo = `${p.marca} — ${/gato/i.test(p.nombre) ? 'Gato' : 'Perro'}`
      grupos.set(titulo, [...(grupos.get(titulo) ?? []), p])
    }
    return [...grupos.entries()]
  }, [productos])

  function datosDeProducto(p: ProductoOpcion): Partial<Bolsa> {
    const kilos = kilosDeBolsa(p.nombre)
    return {
      producto: p.nombre,
      productoOtro: false,
      precio: p.precio !== null ? String(p.precio) : '',
      ...(kilos !== null ? { tamañoBolsaKg: String(kilos) } : {}),
    }
  }

  function cambiarBolsa(id: number, cambios: Partial<Bolsa>) {
    setBolsas(bs => bs.map(b => (b.id === id ? { ...b, ...cambios } : b)))
  }

  function agregarBolsa() {
    setBolsas(bs => [...bs, bolsaVacia(Math.max(...bs.map(b => b.id)) + 1)])
  }

  function quitarBolsa(id: number) {
    setBolsas(bs => bs.filter(b => b.id !== id))
  }

  function elegirProducto(b: Bolsa, valor: string) {
    if (valor === OTRO_PRODUCTO) {
      cambiarBolsa(b.id, { productoOtro: true, producto: '' })
      return
    }
    const p = productos.find(x => x.nombre === valor)
    if (p) cambiarBolsa(b.id, datosDeProducto(p))
  }

  // Si la bolsa todavía no tiene producto, se precarga el que esa mascota llevó la última vez.
  function elegirMascotaDeBolsa(b: Bolsa, key: string) {
    const ultimo = productoDeCatalogo(clienteElegido?.mascotas.find(m => m.id === key)?.ultimoProducto ?? null)
    cambiarBolsa(b.id, {
      mascota: key === principal ? null : key,
      ...(ultimo && !b.producto ? datosDeProducto(ultimo) : {}),
    })
  }

  function elegirMascota(m: MascotaOpcion | null) {
    setPerroId(m?.id ?? null)
    setMascotaNueva(false)
    if (!m) {
      setForm(f => ({ ...f, mascotaNombre: '', mascotaPeso: '', tipoPerro: 'adulto' }))
      setAlimentacion(a => {
        const resto = { ...a }
        delete resto[NUEVA]
        return resto
      })
      return
    }
    // Las bolsas de esta mascota que todavía no tienen producto se precargan
    // con el que llevó la última vez.
    const ultimo = productoDeCatalogo(m.ultimoProducto)
    if (ultimo) {
      setBolsas(bs => bs.map(b => (b.mascota === null && !b.producto ? { ...b, ...datosDeProducto(ultimo) } : b)))
    }
  }

  function otraMascota() {
    elegirMascota(null)
    setMascotaNueva(true)
  }

  function elegirCliente(c: ClienteOpcion) {
    setClienteId(c.id)
    setBusqueda('')
    setResaltado(0)
    setForm(f => ({
      ...f,
      clienteNombre:    c.nombre,
      clienteTelefono:  c.telefono ?? '',
      clienteDireccion: c.direccion ?? '',
    }))
    elegirMascota(c.mascotas.length === 1 ? c.mascotas[0] : null)
  }

  function soltarCliente() {
    setClienteId(null)
    setEspecieNueva('perro')
    setForm(f => ({ ...f, clienteNombre: '', clienteTelefono: '', clienteDireccion: '' }))
    setAlimentacion({})
    setBolsas(bs => bs.map(b => ({ ...b, mascota: null })))
    elegirMascota(null)
  }

  function cambiarModoCliente(modo: 'existente' | 'nuevo', nombre = '') {
    soltarCliente()
    setModoCliente(modo)
    setBusqueda('')
    if (nombre) set('clienteNombre', nombre)
  }

  function teclaEnBusqueda(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setResaltado(i => Math.min(i + 1, resultados.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setResaltado(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      // Enter elige al cliente resaltado en vez de mandar el formulario.
      e.preventDefault()
      if (resultados[resaltado]) elegirCliente(resultados[resaltado])
    } else if (e.key === 'Escape') {
      setListaAbierta(false)
    }
  }

  // Fin de la comida de una mascota. A un perro le duran todos los kilos que
  // se le anotan en la venta (2 bolsas de 7,5 kg = 15 kg); a un gato, los días
  // hasta la próxima compra o la fecha que se ponga.
  function fechaEstimadaDe(m: MascotaEnVenta): string | null {
    const a = alimentacionDe(m.key)
    if (m.especie === 'perro') {
      const kilos = bolsas
        .filter(b => mascotaDe(b) === m.key)
        .reduce((total, b) => total + (parseFloat(b.tamañoBolsaKg) || 0) * (cantidadDe(b) ?? 1), 0)
      if (!kilos || !a.gramosPorComida || !a.vecesAlDia) return null
      const fecha = calcularFechaFinPerro(new Date(), kilos, parseInt(a.gramosPorComida), parseInt(a.vecesAlDia))
      return fecha.toISOString().split('T')[0]
    }
    if (a.intervaloDias) {
      return calcularFechaFinGato(new Date(), parseInt(a.intervaloDias)).toISOString().split('T')[0]
    }
    return a.fechaManual || null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (modoCliente === 'existente' && !clienteElegido) {
      setError('Elegí un cliente de la lista, o pasá a "Cliente nuevo".')
      return
    }
    if (bolsas.some(b => mascotaDe(b) === null)) {
      setError('Elegí para qué mascota es la venta.')
      return
    }
    if (bolsas.some(b => cantidadDe(b) === null)) {
      setError('La cantidad de bolsas tiene que ser 1 o más.')
      return
    }

    const mascotas: MascotaVenta[] = mascotasEnUso.map(m => {
      const a = alimentacionDe(m.key)
      return {
        perroId:          m.key === NUEVA ? null : m.key,
        gramosPorComida:  m.especie === 'perro' ? (parseInt(a.gramosPorComida) || null) : null,
        vecesAlDia:       m.especie === 'perro' ? (parseInt(a.vecesAlDia) || null) : null,
        intervaloDias:    m.especie === 'gato' ? (parseInt(a.intervaloDias) || null) : null,
        fechaEstimadaFin: fechaEstimadaDe(m),
        bolsas: bolsas.filter(b => mascotaDe(b) === m.key).map(b => ({
          producto:      b.producto,
          tamañoBolsaKg: parseFloat(b.tamañoBolsaKg),
          precio:        parseInt(b.precio),
          cantidad:      cantidadDe(b)!,
        })),
      }
    })

    setLoading(true)
    try {
      const result = await registrarVentaAction({
        clienteId:        clienteElegido?.id ?? null,
        clienteNombre:    form.clienteNombre,
        clienteTelefono:  form.clienteTelefono || null,
        clienteDireccion: form.clienteDireccion || null,
        mascotaNueva: mascotasEnUso.some(m => m.key === NUEVA)
          ? {
              nombre:  form.mascotaNombre,
              especie: especieNueva,
              tipo:    especieNueva === 'perro' ? form.tipoPerro : null,
              pesoKg:  parseFloat(form.mascotaPeso) || null,
            }
          : null,
        mascotas,
        casa,
        pagado,
      })

      if (!result.success) {
        setError(result.error ?? 'Error al guardar la venta.')
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      console.error(err)
      setError('Error al guardar la venta. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // Sólo cuentan las bolsas que ya tienen producto (una recién agregada está vacía).
  const bolsasConProducto = bolsas.filter(b => b.producto.trim())
  const totalBolsas = bolsasConProducto.reduce((n, b) => n + (cantidadDe(b) ?? 0), 0)
  const totalPrecio = bolsasConProducto.reduce((n, b) => n + (parseInt(b.precio) || 0) * (cantidadDe(b) ?? 0), 0)

  // Bolsas que se piden de cada producto del stock (puede estar en más de una bolsa).
  const pedidoPorProducto = new Map<ProductoOpcion, number>()
  for (const b of bolsas) {
    const p = productoDeCatalogo(b.producto)
    if (p) pedidoPorProducto.set(p, (pedidoPorProducto.get(p) ?? 0) + (cantidadDe(b) ?? 0))
  }
  const unicoProducto = pedidoPorProducto.size === 1 ? [...pedidoPorProducto.keys()][0] : null
  const faltantes = [...pedidoPorProducto.entries()].filter(([p, n]) => stockEn(p, casa) < n)

  const fechas = mascotasEnUso
    .map(m => ({ m, fecha: fechaEstimadaDe(m) }))
    .filter((x): x is { m: MascotaEnVenta; fecha: string } => x.fecha !== null)

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {/* Cliente */}
      <section className="bg-slate-900 rounded-lg p-5 space-y-3">
        <h3 className="text-white font-semibold">Datos del cliente</h3>
        <div className="flex gap-3 mb-2">
          <button type="button" onClick={() => cambiarModoCliente('existente')} className={toggleCls(modoCliente === 'existente')}>
            Cliente existente
          </button>
          <button type="button" onClick={() => cambiarModoCliente('nuevo')} className={toggleCls(modoCliente === 'nuevo')}>
            Cliente nuevo
          </button>
        </div>

        {modoCliente === 'existente' && !clienteElegido && (
          <div className="relative">
            <label className="block text-xs text-slate-400 mb-1">Buscar cliente *</label>
            <input
              value={busqueda}
              onChange={e => { setBusqueda(e.target.value); setResaltado(0); setListaAbierta(true) }}
              onFocus={() => setListaAbierta(true)}
              onBlur={() => setListaAbierta(false)}
              onKeyDown={teclaEnBusqueda}
              placeholder="Nombre, teléfono, dirección o mascota"
              autoComplete="off"
              className={inputCls}
            />
            {listaAbierta && busqueda.trim() && (
              <div className="absolute z-10 mt-1 w-full bg-slate-800 border border-slate-700 rounded shadow-lg overflow-hidden">
                {resultados.map((c, i) => (
                  <button
                    key={c.id}
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => elegirCliente(c)}
                    onMouseEnter={() => setResaltado(i)}
                    className={`block w-full text-left px-3 py-2 text-sm ${i === resaltado ? 'bg-slate-700' : ''}`}
                  >
                    <span className="text-white">{c.nombre}</span>
                    {!c.activo && <span className="ml-2 text-xs text-slate-500">(de baja)</span>}
                    <span className="block text-xs text-slate-400 truncate">
                      {[
                        c.mascotas.map(m => `${emoji(m.especie)} ${m.nombre}`).join('  '),
                        c.telefono,
                        c.direccion,
                      ].filter(Boolean).join(' · ') || 'Sin datos de contacto'}
                    </span>
                  </button>
                ))}
                {resultados.length === 0 && (
                  <div className="px-3 py-2 text-sm text-slate-400">
                    No hay ningún cliente así.{' '}
                    <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => cambiarModoCliente('nuevo', busqueda.trim())}
                      className="text-amber-400 hover:text-amber-300 underline">
                      Cargarlo como cliente nuevo
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {modoCliente === 'existente' && clienteElegido && (
          <div className="bg-slate-800 border border-slate-700 rounded p-3 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium">{clienteElegido.nombre}</p>
              <p className="text-xs text-slate-400">
                {[clienteElegido.telefono, clienteElegido.direccion].filter(Boolean).join(' · ') || 'Sin teléfono ni dirección cargados'}
              </p>
              {!clienteElegido.activo && (
                <p className="text-xs text-amber-400 mt-1">Estaba dado de baja: con esta venta vuelve a quedar activo.</p>
              )}
            </div>
            <button type="button" onClick={soltarCliente} className="text-xs text-slate-400 hover:text-white underline shrink-0">
              Cambiar
            </button>
          </div>
        )}

        {modoCliente === 'nuevo' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nombre y apellido *</label>
                <input value={form.clienteNombre} onChange={e => set('clienteNombre', e.target.value)} required className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Teléfono</label>
                <input value={form.clienteTelefono} onChange={e => set('clienteTelefono', e.target.value)} className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Dirección</label>
              <input value={form.clienteDireccion} onChange={e => set('clienteDireccion', e.target.value)} className={inputCls} />
            </div>
          </>
        )}
      </section>

      {/* Mascota */}
      <section className="bg-slate-900 rounded-lg p-5 space-y-3">
        <h3 className="text-white font-semibold">Datos de la mascota</h3>

        {clienteElegido && clienteElegido.mascotas.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {clienteElegido.mascotas.map(m => (
              <button key={m.id} type="button" onClick={() => elegirMascota(m)} className={toggleCls(perroId === m.id)}>
                {emoji(m.especie)} {m.nombre}
              </button>
            ))}
            <button type="button" onClick={otraMascota} className={toggleCls(mascotaNueva)}>
              + Otra mascota
            </button>
          </div>
        )}

        {mascotaElegida && (
          <p className="text-sm text-slate-400">
            {[
              mascotaElegida.especie === 'gato' ? 'Gato' : 'Perro',
              mascotaElegida.especie === 'perro' && mascotaElegida.tipo ? TIPO_LABELS[mascotaElegida.tipo] ?? mascotaElegida.tipo : null,
              mascotaElegida.pesoKg !== null ? `${mascotaElegida.pesoKg} kg` : null,
            ].filter(Boolean).join(' · ')}
          </p>
        )}

        {modoCliente === 'existente' && !clienteElegido && (
          <p className="text-sm text-slate-500">Primero elegí el cliente.</p>
        )}

        {clienteElegido && clienteElegido.mascotas.length > 0 && !perroId && !mascotaNueva && (
          <p className="text-sm text-slate-500">Elegí la mascota, o tocá “Otra mascota” si es una nueva.</p>
        )}

        {mostrarCamposMascota && (
          <>
            <div className="flex gap-3 mb-2">
              {(['perro', 'gato'] as const).map(e => (
                <button key={e} type="button" onClick={() => setEspecieNueva(e)} className={toggleCls(especieNueva === e)}>
                  {e === 'perro' ? '🐶 Perro' : '🐱 Gato'}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nombre de la mascota *</label>
                <input value={form.mascotaNombre} onChange={e => set('mascotaNombre', e.target.value)} required className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Peso (kg)</label>
                <input type="number" step="0.1" value={form.mascotaPeso} onChange={e => set('mascotaPeso', e.target.value)} className={inputCls} />
              </div>
              {especieNueva === 'perro' && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Tipo</label>
                  <select value={form.tipoPerro} onChange={e => set('tipoPerro', e.target.value)} className={selectCls}>
                    {Object.entries(TIPO_LABELS).map(([valor, label]) => (
                      <option key={valor} value={valor}>{label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {/* Venta */}
      <section className="bg-slate-900 rounded-lg p-5 space-y-3">
        <h3 className="text-white font-semibold">Datos de la venta</h3>

        {bolsas.map((b, i) => {
          const elegido = b.productoOtro ? null : productos.find(p => p.nombre === b.producto) ?? null
          const deMascota = mascotaDe(b)
          return (
            <div key={b.id} className={bolsas.length > 1 ? 'border border-slate-800 rounded p-3 space-y-3' : 'space-y-3'}>
              {bolsas.length > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Bolsa {i + 1}</p>
                  <button type="button" onClick={() => quitarBolsa(b.id)} className="text-xs text-slate-400 hover:text-red-400">
                    ✕ Quitar
                  </button>
                </div>
              )}

              {mascotasDisponibles.length > 1 && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Para</label>
                  <div className="flex flex-wrap gap-2">
                    {mascotasDisponibles.map(m => (
                      <button key={m.key} type="button" onClick={() => elegirMascotaDeBolsa(b, m.key)}
                        className={toggleCls(deMascota === m.key)}>
                        {emoji(m.especie)} {m.nombre}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs text-slate-400 mb-1">Producto *</label>
                <select
                  value={b.productoOtro ? OTRO_PRODUCTO : b.producto}
                  onChange={e => elegirProducto(b, e.target.value)}
                  required
                  className={selectCls}
                >
                  <option value="" disabled>Elegí un producto</option>
                  {gruposProductos.map(([titulo, lista]) => (
                    <optgroup key={titulo} label={titulo}>
                      {lista.map(p => (
                        <option key={p.nombre} value={p.nombre}>
                          {p.nombre}{p.precio !== null ? ` — ${formatearPrecio(p.precio)}` : ''}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  <option value={OTRO_PRODUCTO}>Otro producto (escribirlo)</option>
                </select>
                {b.productoOtro && (
                  <input value={b.producto} onChange={e => cambiarBolsa(b.id, { producto: e.target.value })} required placeholder="Ej: Promo Adultos"
                    className={`${inputCls} mt-2`} />
                )}
                {b.producto.trim() && !productoDeCatalogo(b.producto) && (
                  <p className="text-xs text-slate-500 mt-1">Este producto no está en la lista de stock: no se descuenta nada.</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Kg bolsa *</label>
                  <input type="number" step="0.5" value={b.tamañoBolsaKg} onChange={e => cambiarBolsa(b.id, { tamañoBolsaKg: e.target.value })} required className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Precio c/u ($) *</label>
                  <input type="number" value={b.precio} onChange={e => cambiarBolsa(b.id, { precio: e.target.value })} required className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Cantidad *</label>
                  <input type="number" min="1" step="1" value={b.cantidad} onChange={e => cambiarBolsa(b.id, { cantidad: e.target.value })} required className={inputCls} />
                </div>
              </div>
              {elegido && elegido.precio !== null && b.precio !== String(elegido.precio) && (
                <p className="text-xs text-slate-500">
                  Precio de lista: {formatearPrecio(elegido.precio)} ·{' '}
                  <button type="button" onClick={() => cambiarBolsa(b.id, { precio: String(elegido.precio) })}
                    className="text-amber-400 hover:text-amber-300 underline">
                    usar ese
                  </button>
                </p>
              )}
            </div>
          )
        })}

        <button type="button" onClick={agregarBolsa}
          className="w-full border border-dashed border-slate-700 rounded py-2 text-sm text-slate-300 hover:border-amber-500 hover:text-amber-400 transition-colors">
          + Agregar otra bolsa
        </button>

        {totalBolsas > 1 && totalPrecio > 0 && (
          <p className="text-sm text-slate-300">
            Total: <strong className="text-white">{formatearPrecio(totalPrecio)}</strong> ({bolsasTexto(totalBolsas)})
          </p>
        )}

        <div className="pt-2 border-t border-slate-800">
          <label className="block text-xs text-slate-400 mb-1">Pago</label>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setPagado(true)} className={toggleCls(pagado)}>✅ Pagado</button>
            <button type="button" onClick={() => setPagado(false)} className={toggleCls(!pagado)}>⏳ Pendiente</button>
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Se descuenta del stock de</label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(CASA_LABELS) as Casa[]).map(c => (
              <button key={c} type="button" onClick={() => setCasa(c)} className={toggleCls(casa === c)}>
                {CASA_LABELS[c]}{unicoProducto ? ` (${stockEn(unicoProducto, c)})` : ''}
              </button>
            ))}
          </div>
          {/* Igual que el bot: avisa pero deja vender (registrar_venta deja el stock en 0, nunca negativo). */}
          {faltantes.map(([p]) => (
            <p key={p.nombre} className="text-xs text-amber-400 mt-1">
              ⚠️ Solo hay {bolsasTexto(stockEn(p, casa))} de {p.nombre} en {CASA_LABELS[casa]}. La venta se guarda igual y el stock queda en 0.
            </p>
          ))}
        </div>

        {mascotasEnUso.map(m => {
          const a = alimentacionDe(m.key)
          return (
            <div key={m.key} className="pt-2 border-t border-slate-800 space-y-2">
              {mascotasEnUso.length > 1 && (
                <p className="text-xs font-semibold text-slate-300">{emoji(m.especie)} {m.nombre}</p>
              )}
              {m.especie === 'perro' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Gramos por comida</label>
                    <input type="number" value={a.gramosPorComida} onChange={e => setAlimentacionDe(m.key, 'gramosPorComida', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Veces al día</label>
                    <select value={a.vecesAlDia} onChange={e => setAlimentacionDe(m.key, 'vecesAlDia', e.target.value)} className={selectCls}>
                      <option value="1">1 vez</option>
                      <option value="2">2 veces</option>
                      <option value="3">3 veces</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Días estimados hasta próxima compra</label>
                    <input type="number" value={a.intervaloDias} onChange={e => setAlimentacionDe(m.key, 'intervaloDias', e.target.value)} placeholder="Ej: 30" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">O fecha exacta (opcional)</label>
                    <input type="date" value={a.fechaManual} onChange={e => setAlimentacionDe(m.key, 'fechaManual', e.target.value)} className={inputCls} />
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {fechas.length > 0 && (
          <div className="bg-amber-950 border border-amber-800 rounded p-3 mt-2 space-y-1">
            {fechas.map(({ m, fecha }) => (
              <p key={m.key} className="text-amber-300 text-sm">
                📅 Fecha estimada fin de bolsa{mascotasEnUso.length > 1 ? ` de ${m.nombre}` : ''}:{' '}
                {/* Sin la hora, 'YYYY-MM-DD' se lee como medianoche UTC y en Uruguay se ve el día anterior. */}
                <strong>{new Date(fecha + 'T12:00:00').toLocaleDateString('es-UY')}</strong>
              </p>
            ))}
          </div>
        )}
      </section>

      {error && (
        <div className="bg-red-950 border border-red-800 rounded p-3 text-red-300 text-sm">{error}</div>
      )}

      <Button type="submit" disabled={loading} className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold">
        {loading ? 'Guardando...' : 'Registrar venta'}
      </Button>
    </form>
  )
}
