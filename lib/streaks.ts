/**
 * Calculate the current consecutive streak from an array of completion date strings.
 * Dates may contain duplicates (one per habit completion per day).
 *
 * @param completions - Array of YYYY-MM-DD strings
 * @returns Consecutive days ending today or yesterday; 0 if no streak
 */
export function calculateStreak(completions: string[]): number {
  if (completions.length === 0) return 0

  const dateSet = new Set(completions)

  function localDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  const today = new Date()
  const todayStr = localDateStr(today)

  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const yesterdayStr = localDateStr(yesterday)

  // Anchor to today if it has completions, otherwise yesterday
  const anchorStr = dateSet.has(todayStr)
    ? todayStr
    : dateSet.has(yesterdayStr)
    ? yesterdayStr
    : null

  if (!anchorStr) return 0

  // Count backward from anchor until a day has no completions
  let streak = 0
  const cursor = new Date(anchorStr + 'T00:00:00')
  while (dateSet.has(localDateStr(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }

  return streak
}
