export type SupportedHistoryPeriod = '30d' | '3m'

export interface HistoryDateRange {
  readonly from: string
  readonly to: string
}

function startOfLocalDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

function formatLocalDate(value: Date): string {
  const year = String(value.getFullYear()).padStart(4, '0')
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function subtractCalendarMonths(value: Date, months: number): Date {
  const targetMonth = new Date(value.getFullYear(), value.getMonth() - months, 1)
  const lastDayOfTargetMonth = new Date(
    targetMonth.getFullYear(),
    targetMonth.getMonth() + 1,
    0,
  ).getDate()
  targetMonth.setDate(Math.min(value.getDate(), lastDayOfTargetMonth))
  return targetMonth
}

export function resolveHistoryDateRange(
  period: SupportedHistoryPeriod,
  today: Date = new Date(),
): HistoryDateRange {
  const to = startOfLocalDay(today)
  const from = startOfLocalDay(today)

  if (period === '30d') {
    from.setDate(from.getDate() - 29)
  } else {
    return {
      from: formatLocalDate(subtractCalendarMonths(from, 3)),
      to: formatLocalDate(to),
    }
  }

  return {
    from: formatLocalDate(from),
    to: formatLocalDate(to),
  }
}
