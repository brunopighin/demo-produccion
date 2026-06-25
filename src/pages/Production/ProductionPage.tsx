import { useMemo, useState } from 'react'
import clsx from 'clsx'
import {
  filterRecords,
  getAvailableDates,
  getLastAvailableDate,
  getMachineById,
  getOperatorById,
  oeeOf,
  scrapPctOf,
  shifts,
} from '@/services/productionService'
import Card from '@/components/ui/Card'
import MonthlyPage from '@/pages/Monthly/MonthlyPage'
import { formatDateLong, formatPct, formatQty } from '@/utils/format'

type Tab = 'diaria' | 'mensual'

export default function ProductionPage() {
  const [tab, setTab] = useState<Tab>('diaria')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-brand-900">Producción</h1>
        <p className="text-sm text-status-idle">Detalle diario y consolidado mensual.</p>
      </div>

      <div className="flex gap-2 border-b border-border pb-3">
        <TabButton active={tab === 'diaria'} onClick={() => setTab('diaria')}>
          Producción Diaria
        </TabButton>
        <TabButton active={tab === 'mensual'} onClick={() => setTab('mensual')}>
          Producción Mensual
        </TabButton>
      </div>

      {tab === 'diaria' ? <DailyProduction /> : <MonthlyPage />}
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

function DailyProduction() {
  const dates = useMemo(() => getAvailableDates(60).slice().reverse(), [])
  const [date, setDate] = useState(getLastAvailableDate())

  const rows = useMemo(() => {
    return filterRecords({ date }).map((r) => {
      const machine = getMachineById(r.machineId)!
      return {
        id: r.id,
        machine: machine.name,
        shift: shifts.find((s) => s.id === r.shiftId)?.name ?? '',
        operator: getOperatorById(r.operatorId)?.name ?? '',
        production: r.qtyProduced,
        unit: machine.unit,
        scrapPct: scrapPctOf(r),
        setupMin: r.timeSetupMin,
        oee: oeeOf(r, machine),
      }
    })
  }, [date])

  const totalM2 = rows.filter((r) => r.unit === 'm2').reduce((acc, r) => acc + r.production, 0)
  const totalGolpes = rows.filter((r) => r.unit === 'golpes').reduce((acc, r) => acc + r.production, 0)

  return (
    <Card
      title="Registros del día"
      subtitle={formatDateLong(date)}
      action={
        <select
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-border bg-surface-alt px-3 py-1.5 text-sm outline-none focus:border-brand-500"
        >
          {dates.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      }
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase text-status-idle">
            <th className="pb-2">Máquina</th>
            <th className="pb-2">Turno</th>
            <th className="pb-2">Operador</th>
            <th className="pb-2">Producción</th>
            <th className="pb-2">Scrap</th>
            <th className="pb-2">Setup</th>
            <th className="pb-2">OEE</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="py-2 font-medium text-brand-900">{r.machine}</td>
              <td className="py-2">{r.shift}</td>
              <td className="py-2">{r.operator}</td>
              <td className="py-2">{formatQty(r.production, r.unit)}</td>
              <td className="py-2">{formatPct(r.scrapPct, 1)}</td>
              <td className="py-2">{r.setupMin} min</td>
              <td className="py-2">{formatPct(r.oee, 1)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-border text-sm font-semibold text-brand-900">
            <td className="pt-2" colSpan={3}>
              Total del día
            </td>
            <td className="pt-2">
              {formatQty(totalM2, 'm2')} · {formatQty(totalGolpes, 'golpes')}
            </td>
            <td className="pt-2" colSpan={3} />
          </tr>
        </tfoot>
      </table>
    </Card>
  )
}
