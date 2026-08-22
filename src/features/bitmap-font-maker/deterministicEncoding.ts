export class DeterministicEncodingError extends Error {
  readonly code = 'PACKAGE_INVALID_JSON' as const

  constructor() {
    super('PACKAGE_INVALID_JSON')
    this.name = 'DeterministicEncodingError'
  }
}

function stable(value: unknown, ancestors: Set<object>): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new DeterministicEncodingError()
    return value
  }
  if (typeof value !== 'object') throw new DeterministicEncodingError()
  if (ancestors.has(value)) throw new DeterministicEncodingError()
  ancestors.add(value)
  try {
    if (Array.isArray(value)) return value.map((child) => stable(child, ancestors))
    if (Object.getPrototypeOf(value) !== Object.prototype) throw new DeterministicEncodingError()
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
        .map(([key, child]) => [key, stable(child, ancestors)]),
    )
  } finally {
    ancestors.delete(value)
  }
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(stable(value, new Set()))
}

export async function sha256Hex(value: ArrayBuffer | Uint8Array<ArrayBufferLike>): Promise<string> {
  const owned = value instanceof ArrayBuffer ? value : Uint8Array.from(value).buffer
  const digest = await crypto.subtle.digest('SHA-256', owned)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}
