'use client'

import { useState } from 'react'

export function BajaButton({ darDeBaja }: { darDeBaja: () => Promise<void> }) {
  const [confirming, setConfirming] = useState(false)

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-sm text-red-400 hover:text-red-300 px-3 py-1.5 rounded border border-red-900 hover:border-red-700 transition-colors"
      >
        Dar de baja
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-slate-400 text-sm">¿Confirmar?</span>
      <form action={darDeBaja}>
        <button type="submit" className="text-sm text-red-400 hover:text-red-300 font-semibold">
          Sí, dar de baja
        </button>
      </form>
      <button onClick={() => setConfirming(false)} className="text-sm text-slate-500 hover:text-white">
        Cancelar
      </button>
    </div>
  )
}
