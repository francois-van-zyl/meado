/**
 * lib/dates.ts
 *
 * Shared local-date helpers used across the app. These utilities avoid
 * UTC-based date formatting so calendar logic stays correct for the
 * user's local timezone.
 */

export function toLocalDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getTodayString(): string {
  return toLocalDateString(new Date())
}

export function getYesterdayString(): string {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return toLocalDateString(yesterday)
}

export function getWeekBounds(date = new Date()) {
  const dayOfWeek = date.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(date)
  monday.setDate(date.getDate() + mondayOffset)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  return {
    monday: toLocalDateString(monday),
    sunday: toLocalDateString(sunday),
    daysElapsed: dayOfWeek === 0 ? 7 : dayOfWeek,
  }
}

export function getLastNDays(count: number): string[] {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (count - 1 - index))
    return toLocalDateString(date)
  })
}
