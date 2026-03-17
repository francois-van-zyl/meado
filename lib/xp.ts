export function calculateLevel(totalXp: number): number {
  return Math.floor(Math.sqrt(totalXp / 100)) + 1
}

export function xpToNextLevel(totalXp: number): number {
  const level = calculateLevel(totalXp)
  return level * level * 100 - totalXp
}

export function getStreakMultiplier(streakDays: number): number {
  if (streakDays >= 30) return 2
  if (streakDays >= 14) return 1.75
  if (streakDays >= 7) return 1.5
  if (streakDays >= 3) return 1.25
  return 1
}

export function getStreakMultiplierLabel(streakDays: number): string {
  if (streakDays >= 30) return '2× seeds'
  if (streakDays >= 14) return '1.75× seeds'
  if (streakDays >= 7) return '1.5× seeds'
  if (streakDays >= 3) return '1.25× seeds'
  return ''
}
