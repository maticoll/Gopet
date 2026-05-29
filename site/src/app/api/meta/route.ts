import { NextResponse } from 'next/server'

const AD_ACCOUNT_ID = 'act_1478730496926394'
const BASE = 'https://graph.facebook.com/v21.0'

function token() {
  return process.env.META_ACCESS_TOKEN!
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const tipo = searchParams.get('tipo') ?? 'resumen'

  try {
    if (tipo === 'campanas') {
      const [campanas, insights] = await Promise.all([
        fetch(`${BASE}/${AD_ACCOUNT_ID}/campaigns?fields=name,status,daily_budget,lifetime_budget,objective&limit=20&access_token=${token()}`).then(r => r.json()),
        fetch(`${BASE}/${AD_ACCOUNT_ID}/insights?fields=campaign_id,campaign_name,impressions,clicks,spend,cpm,ctr,reach,actions&date_preset=last_30d&level=campaign&limit=20&access_token=${token()}`).then(r => r.json()),
      ])

      // Merge insights into campaigns
      const insightsMap = new Map<string, Record<string, string>>()
      for (const ins of (insights.data ?? [])) {
        insightsMap.set(ins.campaign_id, ins)
      }

      const data = (campanas.data ?? []).map((c: Record<string, string>) => ({
        id: c.id,
        nombre: c.name,
        estado: c.status,
        objetivo: c.objective,
        presupuesto_diario: c.daily_budget ? Number(c.daily_budget) / 100 : null,
        ...( insightsMap.get(c.id) ? {
          gasto: Number(insightsMap.get(c.id)!.spend),
          impresiones: Number(insightsMap.get(c.id)!.impressions),
          clics: Number(insightsMap.get(c.id)!.clicks),
          alcance: Number(insightsMap.get(c.id)!.reach),
          cpm: Number(insightsMap.get(c.id)!.cpm).toFixed(2),
          ctr: Number(insightsMap.get(c.id)!.ctr).toFixed(2),
        } : {}),
      }))

      return NextResponse.json({ ok: true, data })
    }

    if (tipo === 'anuncios') {
      const [anuncios, insights] = await Promise.all([
        fetch(`${BASE}/${AD_ACCOUNT_ID}/ads?fields=name,status,campaign_id,adset_id,creative{name,thumbnail_url}&limit=30&access_token=${token()}`).then(r => r.json()),
        fetch(`${BASE}/${AD_ACCOUNT_ID}/insights?fields=ad_id,ad_name,campaign_name,impressions,clicks,spend,cpm,ctr,reach&date_preset=last_30d&level=ad&limit=30&access_token=${token()}`).then(r => r.json()),
      ])

      const insightsMap = new Map<string, Record<string, string>>()
      for (const ins of (insights.data ?? [])) {
        insightsMap.set(ins.ad_id, ins)
      }

      const data = (anuncios.data ?? []).map((a: Record<string, unknown>) => {
        const ins = insightsMap.get(a.id as string)
        return {
          id: a.id,
          nombre: a.name,
          estado: a.status,
          campaign_id: a.campaign_id,
          thumbnail: (a.creative as Record<string, string>)?.thumbnail_url ?? null,
          ...(ins ? {
            gasto: Number(ins.spend),
            impresiones: Number(ins.impressions),
            clics: Number(ins.clicks),
            alcance: Number(ins.reach),
            cpm: Number(ins.cpm).toFixed(2),
            ctr: Number(ins.ctr).toFixed(2),
            campana: ins.campaign_name,
          } : {}),
        }
      })

      return NextResponse.json({ ok: true, data })
    }

    return NextResponse.json({ ok: false, error: 'tipo inválido' }, { status: 400 })
  } catch (e) {
    console.error('Meta API error:', e)
    return NextResponse.json({ ok: false, error: 'Error al llamar a Meta' }, { status: 500 })
  }
}
