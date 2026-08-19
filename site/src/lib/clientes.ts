import { sql } from '@/lib/db'

export interface ClienteEncontrado {
  id: string
  nombre: string
  telefono: string | null
  direccion: string | null
  activo: boolean
}

// Busca un cliente por nombre: primero match exacto (ignorando acentos), luego
// el más parecido por similitud de trigramas (tolera typos y variaciones).
// Devuelve null si no hay ninguno lo bastante parecido → hay que crear uno nuevo.
//
// El ORDER BY no es cosmético: si ya existen duplicados ("Nacho Merli" y
// "Nacho Merlí" son idénticos una vez sacados los acentos), un LIMIT 1 sin
// orden hace que Postgres devuelva cualquiera de los dos y las ventas del
// mismo cliente terminen repartidas entre las dos fichas. Con el orden fijo
// siempre gana la ficha con más historial.
export async function buscarClienteSimilar(nombre: string): Promise<ClienteEncontrado | null> {
  const exacto = await sql`
    SELECT c.id, c.nombre, c.telefono, c.direccion, c.activo,
           (SELECT count(*) FROM ventas v WHERE v.cliente_id = c.id) AS ventas
    FROM clientes c
    WHERE unaccent(lower(c.nombre)) = unaccent(lower(${nombre}))
    ORDER BY ventas DESC, c.activo DESC, c.created_at ASC
    LIMIT 1
  `
  if (exacto.length) return exacto[0] as unknown as ClienteEncontrado

  const similar = await sql`
    SELECT c.id, c.nombre, c.telefono, c.direccion, c.activo,
           similarity(unaccent(lower(c.nombre)), unaccent(lower(${nombre}))) AS sim,
           (SELECT count(*) FROM ventas v WHERE v.cliente_id = c.id) AS ventas
    FROM clientes c
    WHERE similarity(unaccent(lower(c.nombre)), unaccent(lower(${nombre}))) >= 0.4
    ORDER BY sim DESC, ventas DESC, c.activo DESC, c.created_at ASC
    LIMIT 1
  `
  return similar.length ? (similar[0] as unknown as ClienteEncontrado) : null
}

// Fichas distintas del mismo cliente (mismo nombre salvo acentos/mayúsculas).
// Se usa para avisar cuando una operación toca una ficha duplicada.
export async function contarFichasDelMismoNombre(nombre: string): Promise<number> {
  const rows = await sql`
    SELECT count(*)::int AS n FROM clientes
    WHERE unaccent(lower(nombre)) = unaccent(lower(${nombre}))
  `
  return (rows[0]?.n as number) ?? 0
}

// Política de datos de contacto: NUNCA pisar un dato ya cargado.
// El parser a veces atribuye una dirección al cliente equivocado, y hasta ahora
// cada venta hacía UPDATE clientes SET direccion = ... y la dirección buena se
// perdía sin dejar rastro. Ahora sólo se completa lo que está vacío; para
// cambiar un dato existente está el flujo explícito "la dirección de X es Y".
export async function completarDatosContacto(
  cliente: ClienteEncontrado,
  telefono: string | null | undefined,
  direccion: string | null | undefined
): Promise<{ completados: string[]; conflictos: string[] }> {
  const completados: string[] = []
  const conflictos: string[] = []

  if (telefono) {
    if (!cliente.telefono) {
      await sql`UPDATE clientes SET telefono = ${telefono} WHERE id = ${cliente.id}`
      completados.push(`📱 Teléfono: ${telefono}`)
    } else if (normalizar(cliente.telefono) !== normalizar(telefono)) {
      conflictos.push(`📱 Ya tenía el teléfono ${cliente.telefono} — dejé ese`)
    }
  }

  if (direccion) {
    if (!cliente.direccion) {
      await sql`UPDATE clientes SET direccion = ${direccion} WHERE id = ${cliente.id}`
      completados.push(`📍 Dirección: ${direccion}`)
    } else if (normalizar(cliente.direccion) !== normalizar(direccion)) {
      conflictos.push(`📍 Ya tenía la dirección "${cliente.direccion}" — dejé esa`)
    }
  }

  return { completados, conflictos }
}

function normalizar(v: string): string {
  return v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
}
