import { resolveImageUrl } from '@/lib/image'

export interface ResolvedProfileImage {
  readonly url: string | null
  readonly revoke: () => void
}

export async function resolveAuthenticatedProfileImage(
  imageUrl: string | null | undefined,
): Promise<ResolvedProfileImage> {
  return {
    url: resolveImageUrl(imageUrl),
    revoke: () => undefined,
  }
}
