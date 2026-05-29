import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()
const AD_ACCOUNT_ID = 'act_1478730496926394'
const BASE = 'https://graph.facebook.com/v21.0'

async function fetchMetaData(token: string) {
  const [campanas, insights, anunciosInsights] = await Promise.all([
    fetch(`${BASE}/${AD_ACCOUNT_ID}/campaigns?fields=name,status,daily_budget,objective&limit=20&access_token=${token}`).then(r => r.json()),
    fetch(`${BASE}/${AD_ACCOUNT_ID}/insights?fields=campaign_id,campaign_name,impressions,clicks,spend,cpm,ctr,reach&date_preset=last_30d&level=campaign&limit=20&access_token=${token}`).then(r => r.json()),
    fetch(`${BASE}/${AD_ACCOUNT_ID}/insights?fields=ad_id,ad_name,campaign_name,impressions,clicks,spend,cpm,ctr,reach&date_preset=last_30d&level=ad&limit=30&access_token=${token}`).then(r => r.json()),
  ])
  return { campanas: campanas.data ?? [], insights: insights.data ?? [], anuncios: anunciosInsights.data ?? [] }
}

export async function POST(req: Request) {
  const { mensaje, historial } = await req.json()
  const token = process.env.META_ACCESS_TOKEN!

  const { campanas, insights, anuncios } = await fetchMetaData(token)

  const totalGasto = insights.reduce((s: number, i: { spend: string }) => s + Number(i.spend), 0)

  const contexto = `Sos un agente experto en Meta Ads trabajando para GoPet.racion, una empresa uruguaya que vende alimento para mascotas (marca Maxiene). Analizás datos reales de su cuenta publicitaria y das recomendaciones concretas y accionables.

DATOS ACTUALES (últimos 30 días):

CAMPAÑAS:
${campanas.map((c: { name: string; status: string; daily_budget?: string }) => {
  const ins = insights.find((i: { campaign_name: string }) => i.campaign_name === c.name)
  return `- "${c.name}" | Estado: ${c.status} | Presupuesto diario: $${c.daily_budget ? (Number(c.daily_budget)/100).toFixed(0) : '—'} | Gasto 30d: $${ins ? Number(ins.spend).toFixed(2) : '0'} | Impresiones: ${ins?.impressions ?? 0} | Clics: ${ins?.clicks ?? 0} | CTR: ${ins?.ctr ?? '0'}% | CPM: $${ins?.cpm ?? '0'}`
}).join('\n')}

ANUNCIOS (top por gasto):
${anuncios.slice(0, 10).map((a: { ad_name: string; campaign_name: string; spend: string; impressions: string; clicks: string; ctr: string; cpm: string; reach: string }) =>
  `- "${a.ad_name}" | Campaña: ${a.campaign_name} | Gasto: $${Number(a.spend).toFixed(2)} | Impresiones: ${a.impressions} | Clics: ${a.clicks} | CTR: ${a.ctr}% | CPM: $${Number(a.cpm).toFixed(2)} | Alcance: ${a.reach}`
).join('\n')}

TOTAL GASTADO (30d): $${totalGasto.toFixed(2)} UYU

Respondé en español rioplatense, de forma concisa y con recomendaciones específicas sobre los anuncios reales listados arriba. Si te preguntan qué anuncio mejorar, nombrá el anuncio concreto. Usá los datos para justificar tus respuestas.`

  const messages = [
    ...(historial ?? []),
    { role: 'user' as const, content: mensaje },
  ]

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: contexto,
    messages,
  })

  const respuesta = response.content[0].type === 'text' ? response.content[0].text : ''

  return NextResponse.json({ ok: true, respuesta })
}
