const lastSignatures = new Map<string, string>()

export function traceStudioUnit(
  elementId: unknown,
  stage: string,
  details: Record<string, unknown>,
): void {
  const normalizedId = String(elementId ?? '') || 'unknown'
  const payload = { elementId: normalizedId, ...details }
  const key = `${normalizedId}:${stage}`
  const signature = JSON.stringify(payload)
  if (lastSignatures.get(key) === signature) return
  lastSignatures.set(key, signature)
  console.info(`[StudioUnitTrace] ${stage} ${signature}`)
}

export function resetStudioUnitTraceForTests(): void {
  lastSignatures.clear()
}
