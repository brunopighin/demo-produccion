import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { useOperatorRanking, useOperatorDetail } from '@/hooks/useOperatorRanking'
import { getMachineById } from '@/services/productionService'
import type { OperatorKpis } from '@/types'
import Card from '@/components/ui/Card'
import KpiCard from '@/components/ui/KpiCard'
import StatusBadge from '@/components/ui/StatusBadge'
import MachineProductionBar from '@/components/charts/MachineProductionBar'
import OperatorEfficiencyChart from '@/components/charts/OperatorEfficiencyChart'
import { formatPct, formatQty } from '@/utils/format'

type SortKey = 'production' | 'efficiencyPct' | 'setups'

export default function OperatorsPage() {
  const { ranking, operators } = useOperatorRanking(30)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('efficiencyPct')
  const [sortDesc, setSortDesc] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  function operatorName(id: string) {
    return operators.find((o) => o.id === id)?.name ?? id
  }
  function operatorMachine(id: string) {
    const op = operators.find((o) => o.id === id)
    return op ? getMachineById(op.primaryMachineId)?.name ?? '—' : '—'
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    const rows = term ? ranking.filter((r) => operatorName(r.operatorId).toLowerCase().includes(term)) : ranking
    return [...rows].sort((a, b) => (sortDesc ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey]))
  }, [ranking, search, sortKey, sortDesc])

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDesc((d) => !d)
    else {
      setSortKey(key)
      setSortDesc(true)
    }
  }

  const top8 = [...ranking]
    .sort((a, b) => b.efficiencyPct - a.efficiencyPct)
    .slice(0, 8)
    .map((r) => ({ name: operatorName(r.operatorId), value: r.efficiencyPct, status: r.status }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-brand-900">Rendimiento por operador</h1>
        <p className="text-sm text-status-idle">Últimos 30 días disponibles.</p>
      </div>

      <Card title="Top 8 operadores por eficiencia">
        <MachineProductionBar data={top8} formatTooltip={(v) => formatPct(v, 0)} />
      </Card>

      <Card
        title="Ranking de operadores"
        action={
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar operador..."
            className="rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-brand-500"
          />
        }
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-status-idle">
              <th className="pb-2">#</th>
              <th className="pb-2">Operador</th>
              <th className="pb-2">Máquina</th>
              <SortableHeader label="Producción" active={sortKey === 'production'} desc={sortDesc} onClick={() => toggleSort('production')} />
              <SortableHeader label="Eficiencia" active={sortKey === 'efficiencyPct'} desc={sortDesc} onClick={() => toggleSort('efficiencyPct')} />
              <SortableHeader label="Setups" active={sortKey === 'setups'} desc={sortDesc} onClick={() => toggleSort('setups')} />
              <th className="pb-2">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((r: OperatorKpis, idx: number) => (
              <tr
                key={r.operatorId}
                onClick={() => setSelectedId(r.operatorId)}
                className={clsx(
                  'cursor-pointer hover:bg-surface',
                  selectedId === r.operatorId && 'bg-brand-50',
                )}
              >
                <td className="py-2">{idx + 1}</td>
                <td className="py-2 font-medium text-brand-900">{operatorName(r.operatorId)}</td>
                <td className="py-2 text-status-idle">{operatorMachine(r.operatorId)}</td>
                <td className="py-2">{formatQty(r.production, r.unit)}</td>
                <td className="py-2">{formatPct(r.efficiencyPct, 0)}</td>
                <td className="py-2">{r.setups}</td>
                <td className="py-2">
                  <StatusBadge status={r.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="py-4 text-center text-sm text-status-idle">Sin resultados.</p>}
      </Card>

      {selectedId && <OperatorProfile operatorId={selectedId} />}
    </div>
  )
}

function SortableHeader({ label, active, desc, onClick }: { label: string; active: boolean; desc: boolean; onClick: () => void }) {
  return (
    <th className="pb-2 cursor-pointer select-none" onClick={onClick}>
      <span className={clsx(active && 'text-brand-700')}>
        {label} {active && (desc ? '▼' : '▲')}
      </span>
    </th>
  )
}

function OperatorProfile({ operatorId }: { operatorId: string }) {
  const { operator, kpis, trend } = useOperatorDetail(operatorId, 30)
  if (!operator || !kpis) return null

  return (
    <Card title={`👤 ${operator.name}`} subtitle={`Máquina principal: ${getMachineById(operator.primaryMachineId)?.name}`}>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Producción (30 días)" value={formatQty(kpis.production, kpis.unit)} status={kpis.status} />
        <KpiCard label="Eficiencia" value={formatPct(kpis.efficiencyPct, 0)} status={kpis.status} />
        <KpiCard label="Setups" value={String(kpis.setups)} status="sin_datos" />
      </div>
      <div className="mt-4">
        <p className="mb-2 text-sm font-semibold text-brand-900">Tendencia de eficiencia diaria</p>
        <OperatorEfficiencyChart data={trend} />
      </div>
    </Card>
  )
}
