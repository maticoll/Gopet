import { sql } from '@/lib/db'
import { diasHastaFin } from '@/lib/calculations'
import MapaClientes from './MapaClientes'

export const metadata = { title: 'Mapa — PetStock' }

export default async function MapaPage() {
  const clientesRaw = await sql`
    SELECT c.id, c.nombre, c.direccion, c.lat, c.lng
    FROM clientes c
    WHERE c.activo = true AND c.lat IS NOT NULL AND c.lng IS NOT NULL
    ORDER BY c.nombre
  `

  const clientes = await Promise.all(
    clientesRaw.map(async c => {
      const ventas = await sql`
        SELECT p.nombre AS mascota_nombre, v.producto, v.fecha_estimada_fin
        FROM ventas v
        JOIN perros p ON p.id = v.perro_id
        WHERE v.perro_id IN (SELECT id FROM perros WHERE cliente_id = ${c.id})
        ORDER BY v.fecha_venta DESC
      `

      // Una entrada por mascota (la venta más reciente de cada una)
      const mascotasMap = new Map<string, { nombre: string; producto: string; diasRestantes: number | null; fechaFin: string | null }>()
      for (const v of ventas) {
        const nombre = v.mascota_nombre as string
        if (!mascotasMap.has(nombre)) {
          const dias = v.fecha_estimada_fin
            ? diasHastaFin(new Date(v.fecha_estimada_fin as string))
            : null
          mascotasMap.set(nombre, {
            nombre,
            producto: v.producto as string,
            diasRestantes: dias,
            fechaFin: v.fecha_estimada_fin as string | null,
          })
        }
      }

      return {
        id: c.id as string,
        nombre: c.nombre as string,
        direccion: c.direccion as string,
        lat: c.lat as number,
        lng: c.lng as number,
        mascotas: Array.from(mascotasMap.values()),
      }
    })
  )

  const sinUbicacionRaw = await sql`
    SELECT id, nombre FROM clientes
    WHERE activo = true AND (lat IS NULL OR lng IS NULL)
    ORDER BY nombre
  `
  const sinUbicacion = sinUbicacionRaw.map(c => ({
    id: c.id as string,
    nombre: c.nombre as string,
  }))

  return <MapaClientes clientes={clientes} sinUbicacion={sinUbicacion} />
}
