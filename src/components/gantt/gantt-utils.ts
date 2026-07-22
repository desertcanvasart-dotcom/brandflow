export function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function diffDays(a: Date, b: Date) {
  const aStart = startOfDay(a)
  const bStart = startOfDay(b)
  return Math.round((bStart.getTime() - aStart.getTime()) / (1000 * 60 * 60 * 24))
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function isWeekend(date: Date) {
  const day = date.getDay()
  return day === 0 || day === 6
}

export function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function dateToPixel(date: Date, rangeStart: Date, cellWidth: number): number {
  const days = diffDays(rangeStart, date)
  return days * cellWidth
}

export function pixelToDate(px: number, rangeStart: Date, cellWidth: number): Date {
  const days = Math.round(px / cellWidth)
  return addDays(rangeStart, days)
}

export function getMonthGroups(days: Date[]) {
  const groups: { label: string; span: number }[] = []
  let currentMonth = ''
  let currentSpan = 0
  for (const day of days) {
    const month = day.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    if (month !== currentMonth) {
      if (currentMonth) groups.push({ label: currentMonth, span: currentSpan })
      currentMonth = month
      currentSpan = 1
    } else {
      currentSpan++
    }
  }
  if (currentMonth) groups.push({ label: currentMonth, span: currentSpan })
  return groups
}

export function getWeekGroups(days: Date[]) {
  const groups: { label: string; span: number }[] = []
  let currentWeek = -1
  let currentSpan = 0
  for (const day of days) {
    const startOfYear = new Date(day.getFullYear(), 0, 1)
    const weekNum = Math.ceil(((day.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24) + startOfYear.getDay() + 1) / 7)
    if (weekNum !== currentWeek) {
      if (currentWeek !== -1) groups.push({ label: `W${currentWeek}`, span: currentSpan })
      currentWeek = weekNum
      currentSpan = 1
    } else {
      currentSpan++
    }
  }
  if (currentWeek !== -1) groups.push({ label: `W${currentWeek}`, span: currentSpan })
  return groups
}

export function getCellWidth(viewMode: string, zoomLevel: number) {
  const base = viewMode === 'Day' ? 56 : viewMode === 'Week' ? 32 : viewMode === 'Month' ? 20 : 14
  return base * zoomLevel
}

export function computeDateRange(
  viewMode: string,
  tasks: { start_date: string | null; due_date: string | null; created_at: string }[]
) {
  const today = startOfDay(new Date())

  let rStart: Date
  let rEnd: Date

  if (viewMode === 'Quarter') {
    rStart = new Date(today.getFullYear(), today.getMonth(), 1)
    rEnd = new Date(today.getFullYear(), today.getMonth() + 3, 0)
  } else if (viewMode === 'Month') {
    rStart = new Date(today.getFullYear(), today.getMonth(), 1)
    rEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0)
  } else if (viewMode === 'Week') {
    rStart = addDays(today, -7)
    rEnd = addDays(today, 21)
  } else {
    rStart = addDays(today, -3)
    rEnd = addDays(today, 11)
  }

  // Expand if tasks go beyond
  for (const task of tasks) {
    const tStart = startOfDay(new Date(task.start_date || task.created_at.split('T')[0]))
    const tEnd = startOfDay(new Date(task.due_date || addDays(tStart, 3).toISOString().split('T')[0]))
    if (tStart < rStart) rStart = addDays(tStart, -2)
    if (tEnd > rEnd) rEnd = addDays(tEnd, 2)
  }

  const total = diffDays(rStart, rEnd) + 1
  const dayArray: Date[] = []
  for (let i = 0; i < total; i++) {
    dayArray.push(addDays(rStart, i))
  }
  return { rangeStart: rStart, days: dayArray }
}

export function computeDependencyPath(
  fromX: number,
  fromY: number,
  fromWidth: number,
  fromHeight: number,
  toX: number,
  toY: number,
  toHeight: number
): string {
  const startX = fromX + fromWidth
  const startY = fromY + fromHeight / 2
  const endX = toX
  const endY = toY + toHeight / 2
  const midX = (startX + endX) / 2

  return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`
}
