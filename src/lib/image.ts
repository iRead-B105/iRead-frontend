export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  if (url.startsWith('/images/')) return url

  const backendUrl = import.meta.env.VITE_BACKEND_URL
  if (backendUrl) {
    const base = backendUrl.replace(/\/$/, '')
    return url.startsWith('/') ? `${base}${url}` : `${base}/${url}`
  }
  
  return url.startsWith('/') ? url : `/${url}`
}
