import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { TimeBreakdown } from '@/services/productionService'
import { formatMinutesAsHours } from '@/utils/format'

const COLORS = ['#1e4480', '#c98a00', '#d23c3c', '#8a97a8']

export default function TimeDistributionDonut({ data }: { data: TimeBreakdown }) {
  const chartData = [
    { name: 'Productivo', value: data.productiveMin },
    { name: 'Setup', value: data.setupMin },
    { name: 'Parada no prog.', value: data.noProgramadaMin },
    { name: 'Mantenimiento', value: data.mantenimientoMin },
  ].filter((d) => d.value > 0)

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
            {chartData.map((d, idx) => (
              <Cell key={d.name} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => formatMinutesAsHours(Number(value))} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
