import { sql } from '@/lib/db'
import {
  NuevaVentaForm,
  type ClienteOpcion,
  type MascotaOpcion,
  type ProductoOpcion,
} from '@/components/forms/nueva-venta-form'

function numeroONull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export default async function NuevaVentaPage() {
  const [clientesRows, mascotasRows, productosRows] = await Promise.all([
    sql`SELECT id, nombre, telefono, direccion, activo FROM clientes ORDER BY nombre ASC`,
    // Cada mascota con su última venta: sirve para precargar producto y gramos
    // cuando le vuelven a comprar.
    sql`
      SELECT DISTINCT ON (p.id)
        p.id, p.cliente_id, p.nombre, p.especie, p.tipo, p.peso_kg, p.intervalo_compra_dias,
        v.producto, v.gramos_por_comida, v.veces_al_dia
      FROM perros p
      LEFT JOIN ventas v ON v.perro_id = p.id
      ORDER BY p.id, v.fecha_venta DESC NULLS LAST, v.created_at DESC NULLS LAST
    `,
    sql`SELECT nombre, marca, precio_venta, stock_shangrila, stock_departamento FROM productos ORDER BY marca, nombre`,
  ])

  const mascotasPorCliente = new Map<string, MascotaOpcion[]>()
  for (const m of mascotasRows) {
    const lista = mascotasPorCliente.get(m.cliente_id as string) ?? []
    lista.push({
      id:                  m.id as string,
      nombre:              m.nombre as string,
      especie:             m.especie === 'gato' ? 'gato' : 'perro',
      tipo:                (m.tipo as string | null) ?? null,
      pesoKg:              numeroONull(m.peso_kg),
      intervaloCompraDias: numeroONull(m.intervalo_compra_dias),
      ultimoProducto:      (m.producto as string | null) ?? null,
      gramosPorComida:     numeroONull(m.gramos_por_comida),
      vecesAlDia:          numeroONull(m.veces_al_dia),
    })
    mascotasPorCliente.set(m.cliente_id as string, lista)
  }

  const clientes: ClienteOpcion[] = clientesRows.map(c => ({
    id:        c.id as string,
    nombre:    c.nombre as string,
    telefono:  (c.telefono as string | null) ?? null,
    direccion: (c.direccion as string | null) ?? null,
    activo:    c.activo !== false,
    mascotas:  (mascotasPorCliente.get(c.id as string) ?? []).sort((a, b) => a.nombre.localeCompare(b.nombre)),
  }))

  const productos: ProductoOpcion[] = productosRows.map(p => ({
    nombre:            p.nombre as string,
    marca:             (p.marca as string | null) ?? 'Otras marcas',
    precio:            numeroONull(p.precio_venta),
    stockShangrila:    numeroONull(p.stock_shangrila) ?? 0,
    stockDepartamento: numeroONull(p.stock_departamento) ?? 0,
  }))

  return (
    <div>
      <h1 className="text-white text-2xl font-bold mb-6">Nueva venta</h1>
      <NuevaVentaForm clientes={clientes} productos={productos} />
    </div>
  )
}
