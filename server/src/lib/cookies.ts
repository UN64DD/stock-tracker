/**
 * Minimal, dependency-free cookie parsing/serialization. Only what the session
 * cookie needs: an HttpOnly, SameSite=Lax, path-scoped value.
 */

export function parseCookies(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {}
  if (!header) return cookies

  for (const part of header.split(';')) {
    const index = part.indexOf('=')
    if (index === -1) continue
    const name = part.slice(0, index).trim()
    if (!name) continue
    const value = part.slice(index + 1).trim()
    try {
      cookies[name] = decodeURIComponent(value)
    } catch {
      cookies[name] = value
    }
  }

  return cookies
}

export interface SerializeCookieOptions {
  maxAgeSeconds?: number
  secure?: boolean
  sameSite?: 'Lax' | 'Strict' | 'None'
}

export function serializeCookie(
  name: string,
  value: string,
  { maxAgeSeconds, secure = false, sameSite = 'Lax' }: SerializeCookieOptions = {},
): string {
  const segments = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    `SameSite=${sameSite}`,
  ]
  if (typeof maxAgeSeconds === 'number') {
    segments.push(`Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`)
  }
  if (secure) segments.push('Secure')
  return segments.join('; ')
}
