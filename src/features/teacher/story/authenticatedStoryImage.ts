import { downloadFile } from '@/lib/api'

const GENERATED_IMAGE_PATTERN = /^\/uploads\/images\/([0-9a-f-]{36}\.(?:png|jpg|jpeg))$/
const objectUrls = new Map<string, Promise<string>>()

export async function resolveTeacherStoryImage(
  studentId: number,
  storyId: number,
  imageUrl: string | null | undefined,
): Promise<string | null> {
  if (!imageUrl) return null
  const fileName = GENERATED_IMAGE_PATTERN.exec(imageUrl)?.[1]
  if (!fileName) return imageUrl

  const cacheKey = `${studentId}:${storyId}:${fileName}`
  const cached = objectUrls.get(cacheKey)
  if (cached) return cached

  const pending = downloadFile(
    `/api/admin/student/${studentId}/story-history/${storyId}/images/${fileName}`,
  )
    .then(({ blob }) => URL.createObjectURL(blob))
    .catch((error) => {
      objectUrls.delete(cacheKey)
      throw error
    })
  objectUrls.set(cacheKey, pending)
  return pending
}

export async function clearTeacherStoryImages(): Promise<void> {
  const urls = await Promise.allSettled(objectUrls.values())
  urls.forEach((result) => {
    if (result.status === 'fulfilled') URL.revokeObjectURL(result.value)
  })
  objectUrls.clear()
}
