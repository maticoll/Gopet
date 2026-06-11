import { sql } from '@/lib/db'
import StockTable from '../caja/StockTable'
import { editarStock } from '../caja/actions'

export const metadata = { title: 'Stock — PetStock' }

export default async function StockPage() {
  const productosRaw = await sql`
    SELECT nombre, marca, stock_shangrila, stock_departamento FROM productos
    ORDER BY
      CASE marca
        WHEN 'Maxiene' THEN 1
        WHEN 'Lager'   THEN 2
        WHEN 'Connie'  THEN 3
        WHEN 'Wits'    THEN 4
        ELSE 5
      END,
      nombre
  `

  const productos = productosRaw.map(p => ({
    nombre: p.nombre as string,
    marca: p.marca as string,
    stock_shangrila: p.stock_shangrila as number,
    stock_departamento: p.stock_departamento as number,
  }))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Stock</h1>
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <StockTable productos={productos} />
      </div>
    </div>
  )
}
