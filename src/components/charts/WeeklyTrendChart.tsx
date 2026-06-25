import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatDateShort, formatGolpes, formatM2 } from '@/utils/format'
import type { DailySummary } from '@/types'

export default function WeeklyTrendChart({ data }: { data: DailySummary[] }) {
  const chartData = data.map((d) => ({ ...d, label: formatDateShort(d.date) }))

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 10 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dde3ea" />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#15315c' }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="m2" tick={{ fontSize: 12, fill: '#8a97a8' }} axisLine={false} tickLine={false} width={50} />
          <YAxis yAxisId="golpes" orientation="right" tick={{ fontSize: 12, fill: '#8a97a8' }} axisLine={false} tickLine={false} width={60} />
          <Tooltip
            formatter={(value, name) => (name === 'productionM2' ? formatM2(Number(value)) : formatGolpes(Number(value)))}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Legend formatter={(value) => (value === 'productionM2' ? 'Corrugadora (m²)' : 'Resto de máquinas (golpes)')} />
          <Line yAxisId="m2" type="monotone" dataKey="productionM2" stroke="#1e4480" strokeWidth={2.5} dot={{ r: 3 }} />
          <Line yAxisId="golpes" type="monotone" dataKey="productionGolpes" stroke="#c98a00" strokeWidth={2.5} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
