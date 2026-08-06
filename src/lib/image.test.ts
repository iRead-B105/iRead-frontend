import { describe, expect, it, vi } from 'vitest'
import { resolveImageUrl } from './image'

describe('resolveImageUrl', () => {
  it('keeps uploaded images on the browser origin even with an internal backend target', () => {
    vi.stubEnv('VITE_BACKEND_URL', 'http://iread-backend:8080')

    expect(resolveImageUrl('/uploads/images/profile.png')).toBe('/uploads/images/profile.png')
  })

  it('keeps absolute external image URLs unchanged', () => {
    expect(resolveImageUrl('https://cdn.example.com/profile.png')).toBe(
      'https://cdn.example.com/profile.png',
    )
  })
})
