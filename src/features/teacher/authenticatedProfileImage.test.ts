import { describe, expect, it, vi } from 'vitest'

import { resolveAuthenticatedProfileImage } from './authenticatedProfileImage'

describe('resolveAuthenticatedProfileImage', () => {
  it('keeps ordinary image URLs', async () => {
    const resolved = await resolveAuthenticatedProfileImage('/images/default-profile.png')

    expect(resolved.url).toBe('/images/default-profile.png')
  })

  it('keeps uploaded profile images on the browser origin', async () => {
    vi.stubEnv('VITE_BACKEND_URL', 'http://iread-backend:8080')
    const imageUrl = '/uploads/images/123e4567-e89b-12d3-a456-426614174000.png'

    const resolved = await resolveAuthenticatedProfileImage(imageUrl)

    expect(resolved.url).toBe(imageUrl)
  })
})
