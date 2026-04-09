import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Sidebar } from '@/components/dashboard/sidebar'
import { ThemeToggle } from '@/components/theme-toggle'
import { diasHastaFin, fechaHoyUruguay, fechaHoyUruguayISO } from '@/lib/calculations'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Total ventas (todas las históricas)
  const { data: ventasData } = await supabase
    .from('ventas')
    .select('precio')
  const totalVentas = ventasData?.reduce((sum, v) => sum + v.precio, 0) ?? 0

  // Alertas: ventas con fecha_estimada_fin próxima (próximos 14 días para mostrar en sidebar)
  const hoy = fechaHoyUruguayISO()
  const en14dias = fechaHoyUruguay()
  en14dias.setDate(en14dias.getDate() + 14)

  const { data: alertasData } = await supabase
    .from('ventas')
    .select(`
      id,
      producto,
      fecha_estimada_fin,
      clientes(nombre),
      perros(nombre)
    `)
    .not('fecha_estimada_fin', 'is', null)
    .lte('fecha_estimada_fin', en14dias.toISOString().split('T')[0])
    .gte('fecha_estimada_fin', hoy)
    .order('fecha_estimada_fin', { ascending: true })

  const alertas = (alertasData ?? []).map(v => ({
    id: v.id,
    clienteNombre: (v.clientes as any)?.nombre ?? '',
    mascotaNombre: (v.perros as any)?.nombre ?? '',
    producto: v.producto,
    diasRestantes: diasHastaFin(new Date(v.fecha_estimada_fin!)) ?? 0,
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
