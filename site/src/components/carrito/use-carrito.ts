'use client'

import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { resolverItems, calcularTotales, type ItemCarrito } from '@/lib/carrito'

const CLAVE_STORAGE = 'gopet:carrito:v1'
const MAX_POR_ITEM = 99

// ──────────────────────────────────────────────────────────────────────────────
// El carrito vive a nivel de módulo, no dentro de un componente. Así se lee con
// useSyncExternalStore (sin setState dentro de un efecto, que dispara renders en
// cascada) y además queda uno solo compartido por toda la página.
// ──────────────────────────────────────────────────────────────────────────────

let items: ItemCarrito[] = []
let leido = false
const listeners = new Set<() => void>()

/** En el servidor no hay localStorage: siempre arranca vacío. */
const SNAPSHOT_SERVIDOR: ItemCarrito[] = []

/** Filtra cualquier cosa rara que haya quedado guardada en el browser. */
function sanear(valor: unknown): ItemCarrito[] {
  if (!Array.isArray(valor)) return []
  return valor.flatMap(item => {
    if (typeof item !== 'object' || item === null) return []
    const { productoId, varianteIdx, cantidad } = item as Record<string, unknown>
    if (typeof productoId !== 'string') return []
    if (typeof varianteIdx !== 'number' || !Number.isInteger(varianteIdx)) return []
    if (typeof cantidad !== 'number' || !Number.isFinite(cantidad) || cantidad <= 0) return []
    return [{ productoId, varianteIdx, cantidad: Math.min(Math.round(cantidad), MAX_POR_ITEM) }]
  })
}

function leerStorage(): ItemCarrito[] {
  if (typeof window === 'undefined') return SNAPSHOT_SERVIDOR
  try {
    const guardado = window.localStorage.getItem(CLAVE_STORAGE)
    return guardado ? sanear(JSON.parse(guardado)) : []
  } catch {
    // Modo incógnito, storage bloqueado o JSON corrupto: arranca vacío.
    return []
  }
}

/**
 * Tiene que devolver siempre la misma referencia mientras el carrito no cambie,
 * si no React entra en un loop de renders. Por eso se cachea en `items`.
 */
function getSnapshot(): ItemCarrito[] {
  if (!leido) {
    items = leerStorage()
    leido = true
  }
  return items
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  // Si el usuario tiene la web abierta en dos pestañas, que las dos vean lo mismo.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== CLAVE_STORAGE) return
    items = sanear(e.newValue ? JSON.parse(e.newValue) : [])
    leido = true
    listeners.forEach(l => l())
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(cb)
    window.removeEventListener('storage', onStorage)
  }
}

function escribir(nuevos: ItemCarrito[]) {
  items = nuevos
  leido = true
  try {
    window.localStorage.setItem(CLAVE_STORAGE, JSON.stringify(items))
  } catch {
    // Si no se puede guardar, el carrito igual funciona en esta visita.
  }
  listeners.forEach(l => l())
}

export function useCarrito() {
  const crudos = useSyncExternalStore(subscribe, getSnapshot, () => SNAPSHOT_SERVIDOR)

  const agregar = useCallback((productoId: string, varianteIdx: number, cantidad = 1) => {
    const i = items.findIndex(it => it.productoId === productoId && it.varianteIdx === varianteIdx)
    if (i === -1) {
      escribir([...items, { productoId, varianteIdx, cantidad }])
      return
    }
    const copia = [...items]
    copia[i] = { ...copia[i], cantidad: Math.min(copia[i].cantidad + cantidad, MAX_POR_ITEM) }
    escribir(copia)
  }, [])

  const cambiarCantidad = useCallback((productoId: string, varianteIdx: number, cantidad: number) => {
    escribir(
      items.flatMap(it => {
        if (it.productoId !== productoId || it.varianteIdx !== varianteIdx) return [it]
        const nueva = Math.min(Math.max(0, Math.round(cantidad)), MAX_POR_ITEM)
        return nueva === 0 ? [] : [{ ...it, cantidad: nueva }]
      })
    )
  }, [])

  const quitar = useCallback((productoId: string, varianteIdx: number) => {
    escribir(items.filter(it => !(it.productoId === productoId && it.varianteIdx === varianteIdx)))
  }, [])

  const vaciar = useCallback(() => escribir([]), [])

  const resueltos = useMemo(() => resolverItems(crudos), [crudos])
  const totales = useMemo(() => calcularTotales(resueltos), [resueltos])

  /** Cuántas unidades hay de un tamaño concreto. 0 si no está en el carrito. */
  const cantidadDe = useCallback(
    (productoId: string, varianteIdx: number) =>
      crudos.find(it => it.productoId === productoId && it.varianteIdx === varianteIdx)?.cantidad ?? 0,
    [crudos]
  )

  return { items: resueltos, totales, agregar, cambiarCantidad, quitar, vaciar, cantidadDe }
}

export type Carrito = ReturnType<typeof useCarrito>
