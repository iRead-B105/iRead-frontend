import { beforeEach, describe, expect, it, vi } from 'vitest'

const { downloadFile } = vi.hoisted(() => ({ downloadFile: vi.fn() }))
vi.mock('@/lib/api', () => ({ downloadFile }))

import { clearTeacherStoryImages, resolveTeacherStoryImage } from './authenticatedStoryImage'

describe('resolveTeacherStoryImage', () => {
  beforeEach(async () => {
    await clearTeacherStoryImages()
    downloadFile.mockReset()
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:teacher-story-image'),
      revokeObjectURL: vi.fn(),
    })
  })

  it('returns ordinary image URLs without downloading them', async () => {
    await expect(resolveTeacherStoryImage(2001, 180147, '/images/scene.svg'))
      .resolves.toBe('/images/scene.svg')
    expect(downloadFile).not.toHaveBeenCalled()
  })

  it('downloads generated images through the authenticated teacher endpoint', async () => {
    downloadFile.mockResolvedValue({ blob: new Blob(['image']) })
    const imageUrl = '/uploads/images/123e4567-e89b-12d3-a456-426614174000.png'

    await expect(resolveTeacherStoryImage(2001, 180147, imageUrl))
      .resolves.toBe('blob:teacher-story-image')
    expect(downloadFile).toHaveBeenCalledWith(
      '/api/admin/student/2001/story-history/180147/images/123e4567-e89b-12d3-a456-426614174000.png',
    )
  })
})
