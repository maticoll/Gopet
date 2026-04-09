'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

interface SpeciesChartProps {
  perros: number
  gatos: number
}

const COLORS = ['#3b82f6', '#22c55e']

export function SpeciesChart({ perros, gatos }: SpeciesChartProps) {
  const data = [
    { name: 'Perros 🐶', value: perros, color: '#3b82f6' },
    { name: 'Gatos 🐱', value: gatos, color: '#22c55e' },
  ]

  const total = perros + gatos

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        Sin mascotas registradas
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
            innerRadius={45}
            outerRadius={70}
            paddingAngle={2}
            dataKey="value"
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index]} />
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
