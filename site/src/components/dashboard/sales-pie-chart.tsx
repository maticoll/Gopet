'use client'

import { PieChart, Pie, Cell } from 'recharts'

interface SalesPieChartProps {
  totalVentas: number
  meta: number
}

export function SalesPieChart({ totalVentas, meta }: SalesPieChartProps) {
  const porcentaje = Math.min((totalVentas / meta) * 100, 100)
  const restante = 100 - porcentaje
  const data = [
    { value: porcentaje },
    { value: restante },
  ]

  return (
    <div className="flex flex-col items-center">
      <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Meta de ventas</p>
      <div className="relative">
        <PieChart width={120} height={120}>
          <Pie
            data={data}
            cx={55}
            cy={55}
            innerRadius={40}
            outerRadius={55}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            strokeWidth={0}
          >
            <Cell fill="#f59e0b" />
            <Cell fill="#1e293b" />
          </Pie>
        </PieChart>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-amber-400 text-lg font-bold">{Math.round(porcentaje)}%</span>
        </div>
      </div>
      <p className="text-white text-sm font-semibold mt-1">
        ${totalVentas.toLocaleString('es-UY')}
      </p>
      <p className="text-slate-500 text-xs">de ${meta.toLocaleString('es-UY')}</p>
      <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2">
        <div
          className="bg-amber-500 h-1.5 rounded-full transition-all"
          style={{ width: `${porcentaje}%` }}
        />
      </div>
    </div>
  )
}
