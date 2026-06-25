import { useMemo } from 'react'
import {
  machines,
  getAllMachinesKpisForDate,
  getMachineById,
  getMachineKpisForDate,
  getMachineTrend,
  getLastAvailableDate,
  filterRecords,
  getTimeBreakdown,
  getDowntimeLog,
  getAvailableDates,
} from '@/services/productionService'

export function useMachinesOverview(date: string = getLastAvailableDate()) {
  return useMemo(
    () => ({
      machines,
      kpis: getAllMachinesKpisForDate(date),
    }),
    [date],
  )
}

export function useMachineDetail(machineId: string, daysBack = 30, date: string = getLastAvailableDate()) {
  return useMemo(() => {
    const todayRecords = filterRecords({ machineId, date })
    const dates = getAvailableDates(daysBack)
    const from = dates[0]
    const to = dates[dates.length - 1]

    return {
      machine: getMachineById(machineId),
      todayKpis: getMachineKpisForDate(machineId, date),
      trend: getMachineTrend(machineId, daysBack),
      timeBreakdown: getTimeBreakdown(todayRecords),
      downtimeLog: getDowntimeLog(machineId, from, to, 10),
    }
  }, [machineId, daysBack, date])
}
