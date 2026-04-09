'use client'

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts'

interface ProductData {
  nombre: string
  cantidad: number
}

interface ProductsChartProps {
  productos: ProductData[]
}

const COLORS = ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a', '#fef3c7']

export function ProductsChart({ productos }: ProductsChartProps) {
  // Tomar los top 5 productos
  const top5 = productos
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 5)
    .map((p, i) => ({
      ...p,
      // Truncar nombres largos
      nombreCorto: p.nombre.length > 20 ? p.nombre.substring(0, 20) + '...' : p.nombre,
    }))

  if (top5.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        Sin ventas registradas
      </div>
    )
  }

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={top5}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="nombreCorto"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            width={100}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
            }}
            labelStyle={{ color: '#f1f5f9' }}
            itemStyle={{ color: '#f59e0b' }}
            formatter={(value) => [`${value} ventas`, 'Cantidad']}
          />
          <Bar
            dataKey="cantidad"
            radius={[0, 4, 4, 0]}
            maxBarSize={20}
          >
            {top5.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
