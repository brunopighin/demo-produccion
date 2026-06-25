import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatDateShort, formatPct } from '@/utils/format'
import type { OperatorTrendPoint } from '@/services/productionService'

export default function OperatorEfficiencyChart({ data }: { data: OperatorTrendPoint[] }) {
  const chartData = data.map((d) => ({ ...d, label: formatDateShort(d.date) }))

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 10 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dde3ea" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#15315c' }} axisLine={false} tickLine={false} interval={Math.ceil(chartData.length / 10)} />
          <YAxis
            tickFormatter={(v) => formatPct(Number(v), 0)}
            tick={{ fontSize: 12, fill: '#8a97a8' }}
            axisLine={false}
            tickLine={false}
            width={45}
            domain={[0, 1]}
          />
          <Tooltip formatter={(value) => formatPct(Number(value), 1)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Line type="monotone" dataKey="efficiencyPct" stroke="#1e4480" strokeWidth={2.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
