import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateLevel, getStreakMultiplier, getStreakMultiplierLabel, xpToNextLevel } from '../lib/xp.ts'

test('calculateLevel follows the square root progression', () => {
  assert.equal(calculateLevel(0), 1)
  assert.equal(calculateLevel(100), 2)
  assert.equal(calculateLevel(400), 3)
})

test('xpToNextLevel returns remaining xp to the next square threshold', () => {
  assert.equal(xpToNextLevel(0), 100)
  assert.equal(xpToNextLevel(350), 50)
})

test('getStreakMultiplier returns the expected breakpoints', () => {
  assert.equal(getStreakMultiplier(0), 1)
  assert.equal(getStreakMultiplier(3), 1.25)
  assert.equal(getStreakMultiplier(7), 1.5)
  assert.equal(getStreakMultiplier(14), 1.75)
  assert.equal(getStreakMultiplier(30), 2)
})

test('getStreakMultiplierLabel matches the multiplier tiers', () => {
  assert.equal(getStreakMultiplierLabel(0), '')
  assert.equal(getStreakMultiplierLabel(3), '1.25× seeds')
  assert.equal(getStreakMultiplierLabel(30), '2× seeds')
})
