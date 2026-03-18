import test from 'node:test'
import assert from 'node:assert/strict'
import { getLastNDays, getTodayString, getWeekBounds, getYesterdayString, toLocalDateString } from '../lib/dates.ts'

test('toLocalDateString formats a local date as YYYY-MM-DD', () => {
  const date = new Date(2026, 2, 18)
  assert.equal(toLocalDateString(date), '2026-03-18')
})

test('today and yesterday strings differ by one day', () => {
  assert.notEqual(getTodayString(), getYesterdayString())
})

test('getWeekBounds returns a monday and sunday window', () => {
  const { monday, sunday, daysElapsed } = getWeekBounds(new Date(2026, 2, 18))
  assert.equal(monday, '2026-03-16')
  assert.equal(sunday, '2026-03-22')
  assert.equal(daysElapsed, 3)
})

test('getLastNDays returns the requested number of ascending local dates', () => {
  const days = getLastNDays(5)
  assert.equal(days.length, 5)
  assert.equal(new Set(days).size, 5)
  assert.ok(days[0] < days[4])
})
