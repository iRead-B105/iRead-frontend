export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://')) return url

  // VITE_BACKEND_URL is the dev server's Docker-internal proxy target and is
  // not necessarily reachable from the user's browser. Keep relative assets
  // on the frontend origin so Vite/reverse-proxy routing handles /uploads.
  return url.startsWith('/') ? url : `/${url}`
}
