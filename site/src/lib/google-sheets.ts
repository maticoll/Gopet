import { google } from 'googleapis'

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS ?? '{}'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
})

export interface VentaRow {
  clienteNombre: string
  clienteTelefono?: string | null
  clienteDireccion?: string | null
  mascotaNombre: string
  especie: string
  mascotaPeso?: number | null
  producto: string
  tamañoBolsaKg: number
  precio: number
  fechaVenta: string
  fechaEstimadaFin?: string | null
}

export async function appendVentaToSheet(venta: VentaRow): Promise<void> {
  if (!process.env.GOOGLE_SHEETS_ID) {
    console.error('GOOGLE_SHEETS_ID not configured')
    return
  }

  const sheets = google.sheets({ version: 'v4', auth })

  const row = [
    venta.clienteNombre,           // A - Cliente (nombre y apellido)
    venta.clienteTelefono ?? '',   // B - Teléfono
    venta.mascotaNombre,           // C - Nombre del perro/gato
    venta.producto,                // D - Tipo de ración
    venta.clienteDireccion ?? '',  // E - Dirección
    venta.especie,                 // F - Especie (new)
    venta.mascotaPeso ?? '',       // G - Peso mascota (new)
    venta.tamañoBolsaKg,           // H - Tamaño bolsa (new)
    venta.precio,                  // I - Precio (new)
    venta.fechaVenta,              // J - Fecha de venta (new)
    venta.fechaEstimadaFin ?? '',  // K - Fecha estimada fin (new)
  ]

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: 'Clientes!A:K',
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  })
}
