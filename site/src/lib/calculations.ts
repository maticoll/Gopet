/**
 * Obtiene la fecha actual en zona horaria de Uruguay (America/Montevideo).
 * Esto es importante porque el servidor puede estar en UTC.
 */
export function fechaHoyUruguay(): Date {
  // Obtener la fecha/hora actual en formato de Uruguay
  const ahora = new Date()
  const uruguayString = ahora.toLocaleString('en-US', { timeZone: 'America/Montevideo' })
  return new Date(uruguayString)
}

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD en zona horaria de Uruguay.
 */
export function fechaHoyUruguayISO(): string {
  const fecha = fechaHoyUruguay()
  const año = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${año}-${mes}-${dia}`
}

export function calcularGramosPorDia(gramosPorComida: number, vecesAlDia: number): number {
  return gramosPorComida * vecesAlDia
}

export function calcularFechaFinPerro(
  fechaVenta: Date,
  tamañoBolsaKg: number,
  gramosPorComida: number,
  vecesAlDia: number
): Date {
  const gramosPorDia = calcularGramosPorDia(gramosPorComida, vecesAlDia)
  const diasDura = Math.floor((tamañoBolsaKg * 1000) / gramosPorDia)
  const fechaFin = new Date(fechaVenta)
  fechaFin.setDate(fechaFin.getDate() + diasDura)
  return fechaFin
}

/**
 * Calcula la fecha de fin de bolsa usando gramos por día directamente.
 * @param fechaVenta - Fecha de la venta
 * @param tamañoBolsaKg - Tamaño de la bolsa en kg
 * @param gramosPorDia - Consumo diario en gramos (de la tabla de referencia)
 */
export function calcularFechaFinPorGramosDia(
  fechaVenta: Date,
  tamañoBolsaKg: number,
  gramosPorDia: number
): Date {
  const diasDura = Math.floor((tamañoBolsaKg * 1000) / gramosPorDia)
  const fechaFin = new Date(fechaVenta)
  fechaFin.setDate(fechaFin.getDate() + diasDura)
  return fechaFin
}

export function calcularFechaFinGato(fechaVenta: Date, intervaloDias: number): Date {
  const fechaFin = new Date(fechaVenta)
  fechaFin.setDate(fechaFin.getDate() + intervaloDias)
  return fechaFin
}

export function diasHastaFin(fechaFin: Date | null): number | null {
  if (!fechaFin) return null
  const hoy = fechaHoyUruguay()
  hoy.setHours(0, 0, 0, 0)
  const fin = new Date(fechaFin)
  fin.setHours(0, 0, 0, 0)
  return Math.round((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
}
