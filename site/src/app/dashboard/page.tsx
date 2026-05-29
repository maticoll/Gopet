import { sql } from '@/lib/db'
import { CrmTable } from '@/components/dashboard/crm-table'
import { diasHastaFin } from '@/lib/calculations'

export default async function DashboardPage() {
  const ventas = await sql`
    SELECT
      v.id,
      v.producto,
      v.precio,
      v.fecha_venta,
      v.fecha_estimada_fin,
      c.id   AS cliente_id,
      c.nombre AS cliente_nombre,
      c.direccion AS cliente_direccion,
      p.id   AS perro_id,
      p.nombre AS perro_nombre,
      p.especie,
      p.peso_kg
    FROM ventas v
    JOIN clientes c ON c.id = v.cliente_id AND c.activo = true
    LEFT JOIN perros p ON p.id = v.perro_id
    ORDER BY v.fecha_estimada_fin ASC NULLS LAST
  `

  const clientes = ventas.map(v => ({
    ventaId:       v.id as string,
    clienteId:     v.cliente_id as string,
    clienteNombre: v.cliente_nombre as string,
    mascotaNombre: v.perro_nombre as string ?? '',
    mascotaPeso:   v.peso_kg as number | null,
    especie:       (v.especie ?? 'perro') as 'perro' | 'gato',
    producto:      v.producto as string,
    direccion:     v.cliente_direccion as string | null,
    fechaFin:      v.fecha_estimada_fin as string | null,
    diasRestantes: v.fecha_estimada_fin ? diasHastaFin(new Date(v.fecha_estimada_fin as string)) : null,
  }))

  return (
    <div className="space-y-6">
      <CrmTable clientes={clientes} />
    </div>
  )
}
