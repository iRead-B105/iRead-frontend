import { beforeEach, describe, expect, it, vi } from 'vitest'

const { downloadFile } = vi.hoisted(() => ({ downloadFile: vi.fn() }))
vi.mock('@/lib/api', () => ({ downloadFile }))

import { resolveAuthenticatedProfileImage } from './authenticatedProfileImage'

describe('resolveAuthenticatedProfileImage', () => {
  beforeEach(() => {
    downloadFile.mockReset()
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:profile-image'),
      revokeObjectURL: vi.fn(),
    })
  })

  it('keeps ordinary image URLs without an authenticated download', async () => {
    const resolved = await resolveAuthenticatedProfileImage('/images/default-profile.png')

    expect(resolved.url).toBe('/images/default-profile.png')
    expect(downloadFile).not.toHaveBeenCalled()
  })

  it('downloads uploaded profile images with the authenticated API client', async () => {
    downloadFile.mockResolvedValue({ blob: new Blob(['image']) })
    const imageUrl = '/uploads/images/123e4567-e89b-12d3-a456-426614174000.png'

    const resolved = await resolveAuthenticatedProfileImage(imageUrl)

    expect(resolved.url).toBe('blob:profile-image')
    expect(downloadFile).toHaveBeenCalledWith(imageUrl)

    resolved.revoke()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:profile-image')
  })
})
