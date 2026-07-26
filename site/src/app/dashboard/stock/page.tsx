import { sql } from '@/lib/db'
import StockTable from '../caja/StockTable'

export const metadata = { title: 'Stock — PetStock' }

type Producto = {
  nombre: string
  marca: string
  stock_shangrila: number
  stock_departamento: number
}

function esGato(nombre: string): boolean {
  return /gato/i.test(nombre)
}

export default async function StockPage() {
  const productosRaw = await sql`
    SELECT nombre, marca, stock_shangrila, stock_departamento FROM productos
    ORDER BY marca, nombre
  `

  const productos: Producto[] = productosRaw.map(p => ({
    nombre: p.nombre as string,
    marca: p.marca as string,
    stock_shangrila: p.stock_shangrila as number,
    stock_departamento: p.stock_departamento as number,
  }))

  const grupos = [
    { titulo: 'Maxine — Perro', productos: productos.filter(p => p.marca === 'Maxine' && !esGato(p.nombre)) },
    { titulo: 'Maxine — Gato', productos: productos.filter(p => p.marca === 'Maxine' && esGato(p.nombre)) },
    { titulo: 'Lager — Perro', productos: productos.filter(p => p.marca === 'Lager' && !esGato(p.nombre)) },
    { titulo: 'Lager — Gato', productos: productos.filter(p => p.marca === 'Lager' && esGato(p.nombre)) },
    { titulo: 'Otras marcas', productos: productos.filter(p => p.marca !== 'Maxine' && p.marca !== 'Lager') },
  ].filter(g => g.productos.length > 0)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Stock</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {grupos.map(g => (
          <div
            key={g.titulo}
            className={`bg-slate-900 border border-slate-800 rounded-lg p-4 ${g.titulo === 'Otras marcas' ? 'md:col-span-2' : ''}`}
          >
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3">{g.titulo}</h2>
            <StockTable productos={g.productos} />
          </div>
        ))}
      </div>
    </div>
  )
}
