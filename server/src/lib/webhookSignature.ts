import { createHmac, timingSafeEqual } from 'node:crypto'

export interface SvixHeaders {
  id: string | undefined
  timestamp: string | undefined
  signature: string | undefined
}

const DEFAULT_TOLERANCE_SECONDS = 300

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'))
  } catch {
    return false
  }
}

/**
 * Verifies a Svix-style webhook signature, the scheme Resend uses for signed
 * webhook endpoints (`svix-id`, `svix-timestamp`, `svix-signature` headers).
 *
 * The signed payload is `${id}.${timestamp}.${rawBody}`; the signature header
 * carries one or more space-separated `v1,<hex>` candidates computed as
 * HMAC-SHA256 with the endpoint's signing secret. At least one candidate must
 * match, compared in constant time. The timestamp is rejected when outside the
 * tolerance window to blunt replays. The raw body bytes must be used verbatim —
 * re-serializing parsed JSON invalidates the signature.
 */
export function verifySvixSignature(
  secret: string,
  headers: SvixHeaders,
  rawBody: string,
  toleranceSeconds = DEFAULT_TOLERANCE_SECONDS,
  nowMs: number = Date.now(),
): boolean {
  const { id, timestamp, signature } = headers
  if (!id || !timestamp || !signature) return false
  if (!secret) return false

  const timestampSeconds = Number(timestamp)
  if (!Number.isFinite(timestampSeconds)) return false
  if (Math.abs(nowMs / 1000 - timestampSeconds) > toleranceSeconds) return false

  const expected = createHmac('sha256', secret)
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest('hex')

  const candidates = signature.trim().split(/\s+/)
  for (const candidate of candidates) {
    const [version, digest] = candidate.split(',', 2)
    if (version !== 'v1' || !digest) continue
    if (safeEqualHex(expected, digest)) return true
  }
  return false
}
