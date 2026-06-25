import { useMemo } from 'react'
import { getMonthlySummary, getLastAvailableDate, getMonthlyTrend, getOperatorRanking } from '@/services/productionService'

export function useMonthlySummary(year?: number, month?: number) {
  return useMemo(() => {
    const [lastYear, lastMonth] = getLastAvailableDate().split('-').map(Number)
    const y = year ?? lastYear
    const m = month ?? lastMonth

    const summary = getMonthlySummary(y, m)
    const trend = getMonthlyTrend()

    const prevIndex = trend.findIndex((t) => t.year === y && t.month === m) - 1
    const previous = prevIndex >= 0 ? trend[prevIndex] : undefined

    const monthFrom = summary.dailyBreakdown[0]?.date
    const monthTo = summary.dailyBreakdown[summary.dailyBreakdown.length - 1]?.date
    const operatorRanking = monthFrom && monthTo ? getOperatorRanking(monthFrom, monthTo).slice(0, 10) : []

    return { ...summary, previous, trend, operatorRanking }
  }, [year, month])
}
