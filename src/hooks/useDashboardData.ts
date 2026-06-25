import { useMemo } from 'react'
import {
  getDailySummary,
  getAllMachinesKpisForDate,
  getLastAvailableDate,
  getDailySummaries,
  getShiftSummaryForDate,
} from '@/services/productionService'
import { getAlertsForDate } from '@/services/alertsService'

export function useDashboardData(date: string = getLastAvailableDate()) {
  return useMemo(() => {
    const summary = getDailySummary(date)
    const machineKpis = getAllMachinesKpisForDate(date)
    const alerts = getAlertsForDate(date)
    const weeklyTrend = getDailySummaries(7)
    const shiftSummary = getShiftSummaryForDate(date)
    return { date, summary, machineKpis, alerts, weeklyTrend, shiftSummary }
  }, [date])
}
