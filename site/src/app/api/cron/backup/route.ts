import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { overwriteSheetTab } from '@/lib/google-sheets'

// Respaldo semanal: vuelca cada tabla de la base a su propia pestaña del Google Sheets.
// Protegido con CRON_SECRET. Lo dispara el cron de Vercel (ver vercel.json) o se puede
// correr manualmente desde el panel de Vercel.

export const maxDuration = 60

type Fila = Record<string, unknown>

// Serializa un valor de Postgres a algo que acepte Google Sheets
function celda(v: unknown): string | number | boolean {
  if (v === null || v === undefined) return ''
  if (v instanceof Date) return v.toISOString()
  if (typeof v === 'number' || typeof v === 'boolean') return v
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Tablas a respaldar. Cada una se baja entera y se vuelca a una pestaña "Backup <tabla>".
  const tareas: { tabla: string; fetch: () => Promise<Fila[]> }[] = [
    { tabla: 'clientes',          fetch: () => sql`SELECT * FROM clientes ORDER BY nombre` as Promise<Fila[]> },
    { tabla: 'perros',            fetch: () => sql`SELECT * FROM perros` as Promise<Fila[]> },
    { tabla: 'ventas',            fetch: () => sql`SELECT * FROM ventas ORDER BY fecha_venta` as Promise<Fila[]> },
    { tabla: 'movimientos_caja',  fetch: () => sql`SELECT * FROM movimientos_caja ORDER BY COALESCE(fecha, created_at::date)` as Promise<Fila[]> },
    { tabla: 'productos',         fetch: () => sql`SELECT * FROM productos ORDER BY nombre` as Promise<Fila[]> },
    { tabla: 'tabla_gramos',      fetch: () => sql`SELECT * FROM tabla_gramos` as Promise<Fila[]> },
  ]

  const resultado: Record<string, number | string> = {}

  for (const t of tareas) {
    try {
      const rows = await t.fetch()
      const headers = rows.length ? Object.keys(rows[0]) : ['(tabla vacía)']
      const valores = rows.map(r => headers.map(h => celda(r[h])))
      await overwriteSheetTab(`Backup ${t.tabla}`, headers, valores)
      resultado[t.tabla] = rows.length
    } catch (e) {
      resultado[t.tabla] = `error: ${(e as Error).message}`
    }
  }

  // Pestaña con la fecha/hora del último respaldo
  try {
    await overwriteSheetTab(
      'Backup info',
      ['ultimo_backup', 'tablas_respaldadas'],
      [[new Date().toISOString(), tareas.map(t => t.tabla).join(', ')]],
    )
  } catch (e) {
    resultado['info'] = `error: ${(e as Error).message}`
  }

  return NextResponse.json({ ok: true, ...resultado })
}
