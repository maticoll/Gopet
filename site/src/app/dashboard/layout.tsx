import { auth } from '@/lib/auth'
import { sql } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Sidebar } from '@/components/dashboard/sidebar'
import { ThemeToggle } from '@/components/theme-toggle'
import { diasHastaFin, fechaHoyUruguay, fechaHoyUruguayISO } from '@/lib/calculations'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  // Total ventas (todas las históricas)
  const ventasData = await sql`SELECT precio FROM ventas`
  const totalVentas = ventasData.reduce((sum, v) => sum + (v.precio as number), 0)

  // Alertas: ventas con fecha_estimada_fin próxima (próximos 14 días)
  const hoy = fechaHoyUruguayISO()
  const en14dias = fechaHoyUruguay()
  en14dias.setDate(en14dias.getDate() + 14)
  const en14diasISO = en14dias.toISOString().split('T')[0]

  const alertasData = await sql`
    SELECT v.id, v.producto, v.fecha_estimada_fin,
           c.nombre AS cliente_nombre,
           p.nombre AS mascota_nombre
    FROM ventas v
    JOIN clientes c ON c.id = v.cliente_id
    JOIN perros  p ON p.id = v.perro_id
    WHERE v.fecha_estimada_fin IS NOT NULL
      AND v.fecha_estimada_fin >= ${hoy}
      AND v.fecha_estimada_fin <= ${en14diasISO}
    ORDER BY v.fecha_estimada_fin ASC
  `

  const alertas = alertasData.map(v => ({
    id: v.id as string,
    clienteNombre: v.cliente_nombre as string,
    mascotaNombre: v.mascota_nombre as string,
    producto: v.producto as string,
    diasRestantes: diasHastaFin(new Date(v.fecha_estimada_fin as string)) ?? 0,
  }))

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Navbar */}
      <nav className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex justify-between items-center">
        <span className="text-white font-bold">🐾 PetStock</span>
        <div className="flex gap-3 sm:gap-6 items-center flex-wrap justify-end">
          {[
            { href: '/dashboard', label: 'Dashboard' },
            { href: '/dashboard/caja', label: 'Caja' },
            { href: '/ideas', label: 'Ideas' },
            { href: '/agente-meta', label: 'Meta' },
            { href: '/creacion-contenido', label: 'Contenido' },
          ].map(({ href, label }) => (
            <Link key={href} href={href} className="text-slate-400 hover:text-white text-sm transition-colors hidden sm:inline">
              {label}
            </Link>
          ))}
          <ThemeToggle />
          <form action="/api/auth/signout" method="POST">
            <button className="text-slate-500 hover:text-white text-sm">Salir</button>
          </form>
        </div>
      </nav>

      {/* Main */}
      <div className="flex flex-col md:flex-row">
        <Sidebar totalVentas={totalVentas} meta={102000} alertas={alertas} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
