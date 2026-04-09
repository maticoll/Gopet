import { NextRequest, NextResponse } from 'next/server'
import { appendVentaToSheet, VentaRow } from '@/lib/google-sheets'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let ventaData: VentaRow
  try {
    const body = await req.json()
    if (!body?.ventaData?.clienteNombre || !body?.ventaData?.mascotaNombre) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }
    ventaData = body.ventaData as VentaRow
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    await appendVentaToSheet(ventaData)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Google Sheets error:', err)
    return NextResponse.json({ error: 'Sheets error' }, { status: 500 })
  }
}
