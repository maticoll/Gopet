'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from '@/components/theme-toggle'

const navLinks = [
  { href: '/dashboard', label: '📊 Dashboard' },
  { href: '/dashboard/caja', label: '💰 Caja' },
  { href: '/dashboard/info', label: '📈 Info' },
  { href: '/ideas', label: '💡 Ideas' },
  { href: '/agente-meta', label: '📈 Meta' },
  { href: '/creacion-contenido', label: '✍️ Contenido' },
]

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const menuRef = useRef<HTMLDivElement>(null)

  // Cerrar al navegar
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className="sm:hidden relative" ref={menuRef}>
      {/* Botón hamburguesa */}
      <button
        onClick={() => setOpen(!open)}
        className="text-slate-400 hover:text-white transition-colors p-1 rounded"
        aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={open}
      >
        {open ? (
          // X (cerrar)
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          // Hamburguesa
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        )}
      </button>

      {/* Menú desplegable */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
          <nav className="flex flex-col">
            {navLinks.map(({ href, label }) => {
              const isActive = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  className={`px-4 py-3 text-sm transition-colors border-b border-slate-800 last:border-b-0 ${
                    isActive
                      ? 'text-amber-400 bg-slate-800 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {label}
                </Link>
              )
            })}
            <div className="px-4 py-3 flex items-center justify-between border-t border-slate-700">
              <ThemeToggle />
              <form action="/api/auth/signout" method="POST">
                <button className="text-slate-500 hover:text-white text-sm transition-colors">
                  Salir
                </button>
              </form>
            </div>
          </nav>
        </div>
      )}
    </div>
  )
}
