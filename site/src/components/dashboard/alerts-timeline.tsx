'use client'

import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts'

interface AlertasPorSemana {
  semana: string
  cantidad: number
}

interface AlertsTimelineProps {
  alertas: AlertasPorSemana[]
}

export function AlertsTimeline({ alertas }: AlertsTimelineProps) {
  if (alertas.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        Sin alertas próximas
      </div>
    )
  }

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={alertas} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorAlertas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis
            dataKey="semana"
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
            }}
            labelStyle={{ color: '#f1f5f9' }}
            itemStyle={{ color: '#ef4444' }}
            formatter={(value) => [`${value} bolsas`, 'Por terminar']}
          />
          <Area
            type="monotone"
            dataKey="cantidad"
            stroke="#ef4444"
            strokeWidth={2}
            fill="url(#colorAlertas)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
