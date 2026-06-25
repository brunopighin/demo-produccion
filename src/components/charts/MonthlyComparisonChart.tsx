import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { MonthlySummary } from '@/services/productionService'
import { formatGolpes, formatM2 } from '@/utils/format'

const MONTH_LABELS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
]

export default function MonthlyComparisonChart({ data }: { data: MonthlySummary[] }) {
  const chartData = data.map((d) => ({ ...d, label: `${MONTH_LABELS[d.month - 1]} ${d.year}` }))

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dde3ea" />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#15315c' }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="m2" tick={{ fontSize: 12, fill: '#8a97a8' }} axisLine={false} tickLine={false} width={55} />
          <YAxis yAxisId="golpes" orientation="right" tick={{ fontSize: 12, fill: '#8a97a8' }} axisLine={false} tickLine={false} width={60} />
          <Tooltip
            formatter={(value, name) => (name === 'productionM2' ? formatM2(Number(value)) : formatGolpes(Number(value)))}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Legend formatter={(value) => (value === 'productionM2' ? 'Corrugadora (m²)' : 'Resto de máquinas (golpes)')} />
          <Bar yAxisId="m2" dataKey="productionM2" fill="#1e4480" radius={[6, 6, 0, 0]} barSize={40} />
          <Bar yAxisId="golpes" dataKey="productionGolpes" fill="#c98a00" radius={[6, 6, 0, 0]} barSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
