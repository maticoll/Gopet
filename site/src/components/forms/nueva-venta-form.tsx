'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { calcularFechaFinPerro, calcularFechaFinGato, kilosDeBolsa } from '@/lib/calculations'
import { Button } from '@/components/ui/button'
import { registrarVentaAction } from './nueva-venta-actions'

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

const OTRO_PRODUCTO = '__otro__'
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

function bolsas(n: number): string {
  return `${n} bolsa${n !== 1 ? 's' : ''}`
}

function stockEn(p: ProductoOpcion, casa: Casa): number {
  return casa === 'departamento' ? p.stockDepartamento : p.stockShangrila
}

export function NuevaVentaForm({ clientes, productos }: { clientes: ClienteOpcion[]; productos: ProductoOpcion[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [especie, setEspecie] = useState<'perro' | 'gato'>('perro')
  const [modoCliente, setModoCliente] = useState<'existente' | 'nuevo'>('existente')
  const [clienteId, setClienteId] = useState<string | null>(null)
  const [perroId, setPerroId] = useState<string | null>(null)
  const [mascotaNueva, setMascotaNueva] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [listaAbierta, setListaAbierta] = useState(false)
  const [resaltado, setResaltado] = useState(0)
  const [productoOtro, setProductoOtro] = useState(false)
  const [casa, setCasa] = useState<Casa>('shangrila')
  const [pagado, setPagado] = useState(true)
  const [form, setForm] = useState({
    clienteNombre: '', clienteTelefono: '', clienteDireccion: '',
    mascotaNombre: '', mascotaPeso: '', tipoPerro: 'adulto',
    producto: '', tamañoBolsaKg: '', precio: '', cantidad: '1',
    gramosPorComida: '', vecesAlDia: '2',
    intervaloDias: '', fechaManual: '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  const clienteElegido = clientes.find(c => c.id === clienteId) ?? null
  const mascotaElegida = clienteElegido?.mascotas.find(m => m.id === perroId) ?? null
  const productoElegido = productoOtro ? null : productos.find(p => p.nombre === form.producto) ?? null
  // registrar_venta descuenta stock del producto cuyo nombre coincide (sin
  // importar mayúsculas), así que uno escrito a mano también puede descontar.
  const productoConStock = productos.find(p => p.nombre.toLowerCase() === form.producto.trim().toLowerCase()) ?? null
  const cantidad = Number(form.cantidad)

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

  function datosDeProducto(p: ProductoOpcion) {
    const kilos = kilosDeBolsa(p.nombre)
    return {
      producto: p.nombre,
      precio: p.precio !== null ? String(p.precio) : '',
      ...(kilos !== null ? { tamañoBolsaKg: String(kilos) } : {}),
    }
  }

  function elegirProducto(valor: string) {
    if (valor === OTRO_PRODUCTO) {
      setProductoOtro(true)
      setForm(f => ({ ...f, producto: '' }))
      return
    }
    const p = productos.find(x => x.nombre === valor)
    if (!p) return
    setProductoOtro(false)
    setForm(f => ({ ...f, ...datosDeProducto(p) }))
  }

  function elegirMascota(m: MascotaOpcion | null) {
    setPerroId(m?.id ?? null)
    setMascotaNueva(false)
    if (!m) {
      setForm(f => ({
        ...f, mascotaNombre: '', mascotaPeso: '', tipoPerro: 'adulto',
        gramosPorComida: '', vecesAlDia: '2', intervaloDias: '',
      }))
      return
    }
    setEspecie(m.especie)
    // Si todavía no eligieron producto, se precarga el que llevó la última vez.
    const ultimo = m.ultimoProducto
      ? productos.find(p => p.nombre.toLowerCase() === m.ultimoProducto!.toLowerCase())
      : undefined
    if (ultimo && !form.producto) setProductoOtro(false)
    setForm(f => ({
      ...f,
      mascotaNombre:   m.nombre,
      mascotaPeso:     m.pesoKg !== null ? String(m.pesoKg) : '',
      tipoPerro:       m.tipo ?? 'adulto',
      gramosPorComida: m.gramosPorComida !== null ? String(m.gramosPorComida) : '',
      vecesAlDia:      m.vecesAlDia !== null ? String(m.vecesAlDia) : '2',
      intervaloDias:   m.intervaloCompraDias !== null ? String(m.intervaloCompraDias) : '',
      ...(ultimo && !f.producto ? datosDeProducto(ultimo) : {}),
    }))
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
    setEspecie('perro')
    setForm(f => ({ ...f, clienteNombre: '', clienteTelefono: '', clienteDireccion: '' }))
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

  function calcularFechaEstimada(): string | null {
    if (especie === 'perro') {
      if (!form.tamañoBolsaKg || !form.gramosPorComida || !form.vecesAlDia) return null
      const fecha = calcularFechaFinPerro(new Date(), parseFloat(form.tamañoBolsaKg), parseInt(form.gramosPorComida), parseInt(form.vecesAlDia))
      return fecha.toISOString().split('T')[0]
    } else {
      if (form.intervaloDias) {
        return calcularFechaFinGato(new Date(), parseInt(form.intervaloDias)).toISOString().split('T')[0]
      }
      if (form.fechaManual) return form.fechaManual
      return null
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (modoCliente === 'existente' && !clienteElegido) {
      setError('Elegí un cliente de la lista, o pasá a "Cliente nuevo".')
      return
    }
    if (clienteElegido && clienteElegido.mascotas.length > 0 && !perroId && !mascotaNueva) {
      setError('Elegí para qué mascota es la venta.')
      return
    }
    if (!Number.isInteger(cantidad) || cantidad < 1) {
      setError('La cantidad de bolsas tiene que ser 1 o más.')
      return
    }

    setLoading(true)
    try {
      const fechaEstimada = calcularFechaEstimada()
      const result = await registrarVentaAction({
        clienteId:        clienteElegido?.id ?? null,
        clienteNombre:    form.clienteNombre,
        clienteTelefono:  form.clienteTelefono || null,
        clienteDireccion: form.clienteDireccion || null,
        perroId:          mascotaElegida?.id ?? null,
        mascotaNombre:    form.mascotaNombre,
        mascotaPeso:      parseFloat(form.mascotaPeso) || null,
        especie,
        tipoPerro:        especie === 'perro' ? form.tipoPerro : null,
        producto:         form.producto,
        tamañoBolsaKg:    parseFloat(form.tamañoBolsaKg),
        precio:           parseInt(form.precio),
        cantidad,
        casa,
        pagado,
        gramosPorComida:  especie === 'perro' ? (parseInt(form.gramosPorComida) || null) : null,
        vecesAlDia:       especie === 'perro' ? parseInt(form.vecesAlDia) : null,
        intervaloDias:    especie === 'gato' ? (parseInt(form.intervaloDias) || null) : null,
        fechaEstimadaFin: fechaEstimada,
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

  const fechaEstimada = calcularFechaEstimada()
  const mostrarCamposMascota = modoCliente === 'nuevo'
    || (clienteElegido !== null && (clienteElegido.mascotas.length === 0 || mascotaNueva))

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
                        c.mascotas.map(m => `${m.especie === 'gato' ? '🐱' : '🐶'} ${m.nombre}`).join('  '),
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
                {m.especie === 'gato' ? '🐱' : '🐶'} {m.nombre}
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
                <button key={e} type="button" onClick={() => setEspecie(e)} className={toggleCls(especie === e)}>
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
              {especie === 'perro' && (
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
        <div>
          <label className="block text-xs text-slate-400 mb-1">Producto *</label>
          <select
            value={productoOtro ? OTRO_PRODUCTO : form.producto}
            onChange={e => elegirProducto(e.target.value)}
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
          {productoOtro && (
            <input value={form.producto} onChange={e => set('producto', e.target.value)} required placeholder="Ej: Promo Adultos"
              className={`${inputCls} mt-2`} />
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Tamaño bolsa (kg) *</label>
            <input type="number" step="0.5" value={form.tamañoBolsaKg} onChange={e => set('tamañoBolsaKg', e.target.value)} required className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Precio ($) *</label>
            <input type="number" value={form.precio} onChange={e => set('precio', e.target.value)} required className={inputCls} />
            {productoElegido && productoElegido.precio !== null && form.precio !== String(productoElegido.precio) && (
              <p className="text-xs text-slate-500 mt-1">
                Precio de lista: {formatearPrecio(productoElegido.precio)} ·{' '}
                <button type="button" onClick={() => set('precio', String(productoElegido.precio))}
                  className="text-amber-400 hover:text-amber-300 underline">
                  usar ese
                </button>
              </p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Cantidad de bolsas *</label>
            <input type="number" min="1" step="1" value={form.cantidad} onChange={e => set('cantidad', e.target.value)} required className={inputCls} />
            {cantidad > 1 && form.precio && (
              <p className="text-xs text-slate-500 mt-1">Total: {formatearPrecio(cantidad * parseInt(form.precio))}</p>
            )}
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Pago</label>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setPagado(true)} className={toggleCls(pagado)}>✅ Pagado</button>
              <button type="button" onClick={() => setPagado(false)} className={toggleCls(!pagado)}>⏳ Pendiente</button>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Se descuenta del stock de</label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(CASA_LABELS) as Casa[]).map(c => (
              <button key={c} type="button" onClick={() => setCasa(c)} className={toggleCls(casa === c)}>
                {CASA_LABELS[c]}{productoConStock ? ` (${stockEn(productoConStock, c)})` : ''}
              </button>
            ))}
          </div>
          {/* Igual que el bot: avisa pero deja vender (registrar_venta deja el stock en 0, nunca negativo). */}
          {productoConStock && stockEn(productoConStock, casa) < cantidad && (
            <p className="text-xs text-amber-400 mt-1">
              ⚠️ Solo hay {bolsas(stockEn(productoConStock, casa))} en {CASA_LABELS[casa]}. La venta se guarda igual y el stock queda en 0.
            </p>
          )}
          {form.producto.trim() && !productoConStock && (
            <p className="text-xs text-slate-500 mt-1">Este producto no está en la lista de stock: no se descuenta nada.</p>
          )}
        </div>

        {especie === 'perro' && (
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Gramos por comida</label>
              <input type="number" value={form.gramosPorComida} onChange={e => set('gramosPorComida', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Veces al día</label>
              <select value={form.vecesAlDia} onChange={e => set('vecesAlDia', e.target.value)} className={selectCls}>
                <option value="1">1 vez</option>
                <option value="2">2 veces</option>
                <option value="3">3 veces</option>
              </select>
            </div>
          </div>
        )}

        {especie === 'gato' && (
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Días estimados hasta próxima compra</label>
              <input type="number" value={form.intervaloDias} onChange={e => set('intervaloDias', e.target.value)} placeholder="Ej: 30" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">O fecha exacta (opcional)</label>
              <input type="date" value={form.fechaManual} onChange={e => set('fechaManual', e.target.value)} className={inputCls} />
            </div>
          </div>
        )}

        {fechaEstimada && (
          <div className="bg-amber-950 border border-amber-800 rounded p-3 mt-2">
            <p className="text-amber-300 text-sm">
              📅 Fecha estimada fin de bolsa: <strong>{new Date(fechaEstimada).toLocaleDateString('es-UY')}</strong>
            </p>
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
