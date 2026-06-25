import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { MachineStatus, ProductionUnit } from '@/types'
import { formatQty } from '@/utils/format'

const COLORS: Record<MachineStatus, string> = {
  optimo: '#1e9e5a',
  atencion: '#c98a00',
  critico: '#d23c3c',
  sin_datos: '#8a97a8',
}

interface DataPoint {
  name: string
  value: number
  unit?: ProductionUnit
  status: MachineStatus
}

export default function MachineProductionBar({
  data,
  formatTooltip,
}: {
  data: DataPoint[]
  formatTooltip?: (value: number) => string
}) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12, fill: '#15315c' }} axisLine={false} tickLine={false} />
          <Tooltip
            formatter={(value, _name, props) =>
              formatTooltip ? formatTooltip(Number(value)) : formatQty(Number(value), props.payload.unit ?? 'golpes')
            }
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18}>
            {data.map((d) => (
              <Cell key={d.name} fill={COLORS[d.status]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
