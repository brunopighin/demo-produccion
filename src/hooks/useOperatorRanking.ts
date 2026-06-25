import { useMemo } from 'react'
import { getOperatorRanking, getAvailableDates, operators, getOperatorById, getOperatorTrend } from '@/services/productionService'

export function useOperatorRanking(daysBack = 30) {
  return useMemo(() => {
    const dates = getAvailableDates(daysBack)
    const from = dates[0]
    const to = dates[dates.length - 1]
    return { ranking: getOperatorRanking(from, to), operators, from, to }
  }, [daysBack])
}

export function useOperatorDetail(operatorId: string, daysBack = 30) {
  return useMemo(() => {
    const dates = getAvailableDates(daysBack)
    const from = dates[0]
    const to = dates[dates.length - 1]
    const ranking = getOperatorRanking(from, to)
    return {
      operator: getOperatorById(operatorId),
      kpis: ranking.find((r) => r.operatorId === operatorId),
      trend: getOperatorTrend(operatorId, daysBack),
    }
  }, [operatorId, daysBack])
}
