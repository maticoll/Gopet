import AgenteMetaClient from './AgenteMetaClient'

export const metadata = { title: 'Agente Meta — PetStock' }

const AD_ACCOUNT_ID = 'act_1478730496926394'
const BASE = 'https://graph.facebook.com/v21.0'

async function fetchMeta(path: string) {
  const token = process.env.META_ACCESS_TOKEN!
  const res = await fetch(`${BASE}/${path}&access_token=${token}`, { next: { revalidate: 300 } })
  return res.json()
}

export default async function AgenteMetaPage() {
  const token = process.env.META_ACCESS_TOKEN

  if (!token) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400">Falta configurar META_ACCESS_TOKEN en las variables de entorno.</p>
      </div>
    )
  }

  const [campanas, insightsCampanas, anuncios, insightsAnuncios] = await Promise.all([
    fetchMeta(`${AD_ACCOUNT_ID}/campaigns?fields=name,status,daily_budget,objective&limit=20`),
    fetchMeta(`${AD_ACCOUNT_ID}/insights?fields=campaign_id,campaign_name,impressions,clicks,spend,cpm,ctr,reach&date_preset=last_30d&level=campaign&limit=20`),
    fetchMeta(`${AD_ACCOUNT_ID}/ads?fields=name,status,campaign_id,creative{name,thumbnail_url}&limit=30`),
    fetchMeta(`${AD_ACCOUNT_ID}/insights?fields=ad_id,ad_name,campaign_name,impressions,clicks,spend,cpm,ctr,reach&date_preset=last_30d&level=ad&limit=30`),
  ])

  const insightsMapC = new Map<string, Record<string, string>>()
  for (const ins of (insightsCampanas.data ?? [])) {
    insightsMapC.set(ins.campaign_id, ins)
  }

  const insightsMapA = new Map<string, Record<string, string>>()
  for (const ins of (insightsAnuncios.data ?? [])) {
    insightsMapA.set(ins.ad_id, ins)
  }

  const campanasMapped = (campanas.data ?? []).map((c: Record<string, string>) => {
    const ins = insightsMapC.get(c.id)
    return {
      id: c.id,
      nombre: c.name,
      estado: c.status,
      objetivo: c.objective,
      presupuesto_diario: c.daily_budget ? Number(c.daily_budget) / 100 : null,
      ...(ins ? {
        gasto: Number(ins.spend),
        impresiones: Number(ins.impressions),
        clics: Number(ins.clicks),
        alcance: Number(ins.reach),
        cpm: Number(ins.cpm).toFixed(2),
        ctr: Number(ins.ctr).toFixed(2),
      } : {}),
    }
  })

  const anunciosMapped = (anuncios.data ?? []).map((a: Record<string, unknown>) => {
    const ins = insightsMapA.get(a.id as string)
    return {
      id: a.id as string,
      nombre: a.name as string,
      estado: a.status as string,
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
  }).filter((a: { gasto?: number }) => a.gasto !== undefined)
    .sort((a: { gasto?: number }, b: { gasto?: number }) => (b.gasto ?? 0) - (a.gasto ?? 0))

  return <AgenteMetaClient campanas={campanasMapped} anuncios={anunciosMapped} />
}
