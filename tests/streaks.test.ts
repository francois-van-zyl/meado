import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateStreak } from '../lib/streaks.ts'
import { getTodayString, getYesterdayString } from '../lib/dates.ts'

test('calculateStreak returns 0 for no completions', () => {
  assert.equal(calculateStreak([]), 0)
})

test('calculateStreak counts a streak anchored on today', () => {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const twoDaysAgo = new Date(today)
  twoDaysAgo.setDate(today.getDate() - 2)

  const completions = [
    getTodayString(),
    getYesterdayString(),
    `${twoDaysAgo.getFullYear()}-${String(twoDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(twoDaysAgo.getDate()).padStart(2, '0')}`,
  ]

  assert.equal(calculateStreak(completions), 3)
})

test('calculateStreak anchors on yesterday if today is missing', () => {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const twoDaysAgo = new Date(yesterday)
  twoDaysAgo.setDate(yesterday.getDate() - 1)

  const completions = [
    `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`,
    `${twoDaysAgo.getFullYear()}-${String(twoDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(twoDaysAgo.getDate()).padStart(2, '0')}`,
  ]

  assert.equal(calculateStreak(completions), 2)
})

test('calculateStreak ignores duplicate completions on the same date', () => {
  const today = getTodayString()
  assert.equal(calculateStreak([today, today]), 1)
})
