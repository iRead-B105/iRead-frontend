import { describe, expect, it, vi } from 'vitest'
import { resolveReferenceDate } from './devReferenceDate'

describe('resolveReferenceDate', () => {
  it('uses the backend demo date when it is available', async () => {
    const fallback = vi.fn(() => new Date('2026-08-03T12:00:00+09:00'))

    const result = await resolveReferenceDate(
      2001,
      fallback,
      async () => new Date('2026-08-04T12:00:00+09:00'),
    )

    expect(result.getDate()).toBe(4)
    expect(fallback).not.toHaveBeenCalled()
  })

  it('falls back to the browser date outside the demo backend', async () => {
    const result = await resolveReferenceDate(
      2001,
      () => new Date('2026-08-03T12:00:00+09:00'),
      async () => null,
    )

    expect(result.getDate()).toBe(3)
  })
})
