import { sql } from '@/lib/db'
import MascotaCard from '../dashboard/clientes/[id]/MascotaCard'

export const dynamic = 'force-dynamic'

export default async function DebugPage() {
  const id = '4fd00277-e2db-47d9-9c33-79c3943f70ea'
  const mascotas = await sql`SELECT * FROM perros WHERE cliente_id = ${id}`
  const mascotasConVentas = await Promise.all(
    mascotas.map(async (mascota) => {
      const ventas = await sql`
        SELECT * FROM ventas WHERE perro_id = ${mascota.id as string}
        ORDER BY fecha_venta DESC
      `
      return { ...(mascota as Record<string, unknown>), ventas } as Record<string, unknown> & { ventas: Record<string, unknown>[] }
    })
  )

  return (
    <div>
      {mascotasConVentas.map((mascota) => (
        <MascotaCard
          key={mascota.id as string}
          clienteId={id}
          mascota={{
            id: mascota.id as string,
            nombre: mascota.nombre as string,
            especie: mascota.especie as string,
            tipo: mascota.tipo as string | null,
            peso_kg: mascota.peso_kg as number | null,
            ventas: (mascota.ventas as Record<string, unknown>[]).map(v => ({
              id: v.id as string,
              producto: v.producto as string,
              precio: v.precio as number,
              fecha_venta: v.fecha_venta as string,
              fecha_estimada_fin: v.fecha_estimada_fin as string | null,
            })),
          }}
        />
      ))}
    </div>
  )
}
