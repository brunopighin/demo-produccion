import { useState } from 'react'
import clsx from 'clsx'
import { useMachinesOverview, useMachineDetail } from '@/hooks/useMachineKpis'
import { getObjective } from '@/services/productionService'
import { simpleLines } from '@/services/simpleLineService'
import Card from '@/components/ui/Card'
import StatusBadge from '@/components/ui/StatusBadge'
import KpiCard from '@/components/ui/KpiCard'
import OeeTrendChart from '@/components/charts/OeeTrendChart'
import TimeDistributionDonut from '@/components/charts/TimeDistributionDonut'
import SimpleLineDetail from './SimpleLineDetail'
import { formatMinutesAsHours, formatPct, formatQty } from '@/utils/format'

export default function MachinesPage() {
  const { machines, kpis } = useMachinesOverview()
  const [selected, setSelected] = useState<string>('all')

  const simpleLineIds = new Set(simpleLines.map((l) => l.id))
  const isSimpleLine = simpleLineIds.has(selected)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-brand-900">Rendimiento por máquina</h1>
        <p className="text-sm text-status-idle">Datos del día más reciente disponible.</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        <TabButton active={selected === 'all'} onClick={() => setSelected('all')}>
          Todas
        </TabButton>
        {machines.map((m) => (
          <TabButton key={m.id} active={selected === m.id} onClick={() => setSelected(m.id)}>
            {m.name}
          </TabButton>
        ))}
        {simpleLines.map((l) => (
          <TabButton key={l.id} active={selected === l.id} onClick={() => setSelected(l.id)}>
            {l.name}
          </TabButton>
        ))}
      </div>

      {selected === 'all' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {machines.map((m) => {
            const k = kpis.find((x) => x.machineId === m.id)!
            return (
              <Card key={m.id} className="cursor-pointer hover:border-brand-300" >
                <div onClick={() => setSelected(m.id)}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-brand-900">{m.name}</h3>
                    <StatusBadge status={k.status} />
                  </div>
                  <dl className="mt-3 space-y-1.5 text-sm">
                    <Row label="Producción" value={formatQty(k.production, k.unit)} />
                    <Row label="Rendimiento" value={formatPct(k.performance, 0)} />
                    <Row label="Scrap" value={formatPct(k.scrapPct, 1)} />
                    <Row label="Setup" value={formatMinutesAsHours(k.setupMinutes)} />
                  </dl>
                </div>
              </Card>
            )
          })}
        </div>
      ) : isSimpleLine ? (
        <SimpleLineDetail lineId={selected} />
      ) : (
        <MachineDetail machineId={selected} />
      )}
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
        active ? 'bg-brand-700 text-white' : 'bg-surface-alt text-status-idle hover:text-brand-900 border border-border',
      )}
    >
      {children}
    </button>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-status-idle">{label}</dt>
      <dd className="font-medium text-brand-900">{value}</dd>
    </div>
  )
}

function MachineDetail({ machineId }: { machineId: string }) {
  const { machine, todayKpis, trend, timeBreakdown, downtimeLog } = useMachineDetail(machineId, 30)
  if (!machine) return null

  const oeeTarget = getObjective(machineId, 'oee', 'daily')?.targetValue

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <KpiCard label="Producción" value={formatQty(todayKpis.production, todayKpis.unit)} status={todayKpis.status} />
        <KpiCard label="Disponibilidad" value={formatPct(todayKpis.availability, 0)} status={todayKpis.status} />
        <KpiCard label="Rendimiento" value={formatPct(todayKpis.performance, 0)} status={todayKpis.status} />
        <KpiCard label="Calidad" value={formatPct(todayKpis.quality, 0)} status={todayKpis.status} />
        <KpiCard label="OEE" value={formatPct(todayKpis.oee, 1)} status={todayKpis.status} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="OEE — últimos 30 días" subtitle={oeeTarget ? `Meta: ${formatPct(oeeTarget, 0)}` : undefined}>
          <OeeTrendChart data={trend} target={oeeTarget} />
        </Card>
        <Card title="Distribución del tiempo (hoy)">
          <TimeDistributionDonut data={timeBreakdown} />
        </Card>
      </div>

      <Card title="Paradas recientes">
        {downtimeLog.length === 0 ? (
          <p className="text-sm text-status-idle">Sin paradas registradas en el período.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-status-idle">
                <th className="pb-2">Fecha</th>
                <th className="pb-2">Turno</th>
                <th className="pb-2">Tipo</th>
                <th className="pb-2">Motivo</th>
                <th className="pb-2 text-right">Duración</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {downtimeLog.map((row, idx) => (
                <tr key={idx}>
                  <td className="py-2">{row.date}</td>
                  <td className="py-2">{row.shiftName}</td>
                  <td className="py-2 capitalize">{row.type.replace('_', ' ')}</td>
                  <td className="py-2">{row.reason}</td>
                  <td className="py-2 text-right">{row.minutes} min</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
