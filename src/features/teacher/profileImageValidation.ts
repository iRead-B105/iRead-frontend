export const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024

const allowedImageTypesByExtension: Readonly<Record<string, string>> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
}

export function validateProfileImage(file: File): string | null {
  if (file.size === 0) {
    return '비어 있는 파일은 선택할 수 없습니다.'
  }

  const extension = file.name.split('.').pop()?.toLocaleLowerCase()
  if (!extension || allowedImageTypesByExtension[extension] !== file.type) {
    return 'JPG 또는 PNG 파일만 선택할 수 있습니다.'
  }

  if (file.size > PROFILE_IMAGE_MAX_BYTES) {
    return '이미지는 5MB 이하만 선택할 수 있습니다.'
  }

  return null
}
