type RotatingHandBindingConfig = {
  dialProperty?: unknown
  progressMode?: unknown
}

type DialOption = {
  value?: unknown
  metricSymbol?: unknown
  dialMode?: unknown
  dialDirectionUnit?: unknown
}

type DialProperty = {
  type?: unknown
  dialMode?: unknown
  value?: unknown
  options?: DialOption[]
}

export function resolveRotatingHandBindingIssue(
  config: RotatingHandBindingConfig,
  property: DialProperty | undefined,
): string | null {
  const key = String(config.dialProperty ?? '').trim()
  if (!key || !property || property.type !== 'dial') {
    return 'Rotating Hand requires a Dial Property.'
  }

  if (property.dialMode !== config.progressMode) {
    return 'Rotating Hand mode does not match its Dial Property.'
  }

  const selected = property.options?.find(option => option.value === property.value)
  const metricSymbol = String(selected?.metricSymbol ?? '').trim()
  if (!selected || selected.dialMode !== config.progressMode || !metricSymbol.startsWith(':')) {
    return 'Rotating Hand Dial Property has no canonical metric symbol.'
  }

  if (config.progressMode === 'direction' && selected.dialDirectionUnit !== 'degree') {
    return 'Rotating Hand Direction option must use degrees.'
  }

  return null
}
