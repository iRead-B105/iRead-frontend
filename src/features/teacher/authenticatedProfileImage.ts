import { downloadFile } from '@/lib/api'
import { resolveImageUrl } from '@/lib/image'

const UPLOADED_PROFILE_IMAGE_PATTERN = /^\/uploads\/images\/[0-9a-f-]{36}\.(?:png|jpe?g)$/i

export interface ResolvedProfileImage {
  readonly url: string | null
  readonly revoke: () => void
}

export async function resolveAuthenticatedProfileImage(
  imageUrl: string | null | undefined,
): Promise<ResolvedProfileImage> {
  if (!imageUrl || !UPLOADED_PROFILE_IMAGE_PATTERN.test(imageUrl)) {
    return {
      url: resolveImageUrl(imageUrl),
      revoke: () => undefined,
    }
  }

  const { blob } = await downloadFile(imageUrl)
  const objectUrl = URL.createObjectURL(blob)

  return {
    url: objectUrl,
    revoke: () => URL.revokeObjectURL(objectUrl),
  }
}
