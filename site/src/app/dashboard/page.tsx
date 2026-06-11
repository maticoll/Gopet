import { sql } from '@/lib/db'
import { CrmTable } from '@/components/dashboard/crm-table'
import { diasHastaFin } from '@/lib/calculations'

export default async function DashboardPage() {
  // Una fila por mascota con su última venta — luego agrupamos por cliente en JS
  const rows = await sql`
    WITH ultima_venta AS (
      SELECT DISTINCT ON (v.perro_id)
        v.perro_id,
        v.cliente_id,
        v.producto,
        v.fecha_estimada_fin
      FROM ventas v
      ORDER BY v.perro_id, v.fecha_venta DESC
    ),
    compras_cliente AS (
      SELECT
        v.cliente_id,
        MIN(v.fecha_venta) AS primera_compra,
        MAX(v.fecha_venta) AS ultima_compra
      FROM ventas v
      GROUP BY v.cliente_id
    )
    SELECT
      c.id          AS cliente_id,
      c.nombre      AS cliente_nombre,
      c.direccion,
      p.id          AS perro_id,
      p.nombre      AS perro_nombre,
      p.especie,
      p.peso_kg,
      uv.producto,
      uv.fecha_estimada_fin,
      cc.primera_compra,
      cc.ultima_compra
    FROM clientes c
    JOIN perros p ON p.cliente_id = c.id
    LEFT JOIN ultima_venta uv ON uv.perro_id = p.id
    LEFT JOIN compras_cliente cc ON cc.cliente_id = c.id
    WHERE c.activo = true
    ORDER BY c.nombre ASC
  `

  // Agrupar por cliente
  const clientesMap = new Map<string, {
    clienteId: string
    clienteNombre: string
    direccion: string | null
    primeraCompra: string | null
    ultimaCompra: string | null
    mascotas: {
      mascotaId: string
      mascotaNombre: string
      especie: 'perro' | 'gato'
      mascotaPeso: number | null
      producto: string | null
      fechaFin: string | null
      diasRestantes: number | null
    }[]
    proximosDias: number | null
  }>()

  for (const r of rows) {
    const cId = r.cliente_id as string
    if (!clientesMap.has(cId)) {
      clientesMap.set(cId, {
        clienteId: cId,
        clienteNombre: r.cliente_nombre as string,
        direccion: r.direccion as string | null,
        primeraCompra: r.primera_compra ? String(r.primera_compra).slice(0, 10) : null,
        ultimaCompra: r.ultima_compra ? String(r.ultima_compra).slice(0, 10) : null,
        mascotas: [],
        proximosDias: null,
      })
    }
    const entry = clientesMap.get(cId)!
    const dias = r.fecha_estimada_fin ? diasHastaFin(new Date(r.fecha_estimada_fin as string)) : null
    entry.mascotas.push({
      mascotaId: r.perro_id as string,
      mascotaNombre: r.perro_nombre as string,
      especie: (r.especie ?? 'perro') as 'perro' | 'gato',
      mascotaPeso: r.peso_kg as number | null,
      producto: r.producto as string | null,
      fechaFin: r.fecha_estimada_fin as string | null,
      diasRestantes: dias,
    })
    // Guardar el fin de bolsa más próximo del cliente
    if (dias !== null && (entry.proximosDias === null || dias < entry.proximosDias)) {
      entry.proximosDias = dias
    }
  }

  // Ordenar por días restantes (los más urgentes primero, sin fecha al final)
  const clientes = Array.from(clientesMap.values()).sort((a, b) => {
    if (a.proximosDias === null && b.proximosDias === null) return 0
    if (a.proximosDias === null) return 1
    if (b.proximosDias === null) return -1
    return a.proximosDias - b.proximosDias
  })

  return (
    <div className="space-y-6">
      <CrmTable clientes={clientes} />
    </div>
  )
}
