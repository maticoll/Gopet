'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

interface AcquisitionChartProps {
  origenes: { origen: string | null; cantidad: number }[]
}

const LABELS: Record<string, string> = {
  meta_ads:      'Meta Ads',
  tocar_puerta:  'Toca puerta',
  boca_a_boca:   'Boca a boca',
  recomendacion: 'Recomendación',
  conocido:      'Conocido',
  sin_datos:     'Sin datos',
}

const COLORS = ['#f59e0b', '#3b82f6', '#22c55e', '#a855f7', '#ec4899', '#64748b']

export function AcquisitionChart({ origenes }: AcquisitionChartProps) {
  const data = origenes.map(o => ({
    name: LABELS[o.origen ?? 'sin_datos'] ?? o.origen ?? 'Sin datos',
    value: o.cantidad,
  }))

  if (data.length === 0 || data.every(d => d.value === 0)) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        Sin datos registrados
      </div>
    )
  }

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={65}
            paddingAngle={2}
            dataKey="value"
            labelLine={false}
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
            }}
            itemStyle={{ color: '#f1f5f9' }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => (
              <span className="text-slate-300 text-xs">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
