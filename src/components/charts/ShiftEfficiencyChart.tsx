import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatPct } from '@/utils/format'

interface DataPoint {
  shiftName: string
  oeeAvg: number
}

function colorFor(oee: number): string {
  if (oee >= 0.8) return '#1e9e5a'
  if (oee >= 0.65) return '#c98a00'
  return '#d23c3c'
}

export default function ShiftEfficiencyChart({ data }: { data: DataPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10 }}>
          <XAxis dataKey="shiftName" tick={{ fontSize: 12, fill: '#15315c' }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip formatter={(value) => formatPct(Number(value), 1)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Bar dataKey="oeeAvg" radius={[6, 6, 0, 0]} barSize={48}>
            {data.map((d) => (
              <Cell key={d.shiftName} fill={colorFor(d.oeeAvg)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
