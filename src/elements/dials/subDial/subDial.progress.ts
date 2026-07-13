export type SubDialResolvedProgressMode = 'goal' | 'range' | 'none'

export interface SubDialProgressSourceMeta {
  value: number | null
  displayValue: string
  icon: string | null
  label: string
  unit: string
  goal: number | null
  min: number | null
  max: number | null
}

export type SubDialProgressOptions = { mode: 'auto' | 'goal' | 'range' } | { mode: 'custom'; customMin: number; customMax: number }

export interface SubDialProgressData {
  value: number | null
  displayValue: string
  icon: string | null
  label: string
  unit: string
  mode: SubDialResolvedProgressMode
  goal: number | null
  min: number | null
  max: number | null
  percentage: number | null
  valid: boolean
}

function invalidProgress(source: SubDialProgressSourceMeta): SubDialProgressData {
  return {
    value: source.value,
    displayValue: source.displayValue,
    icon: source.icon,
    label: source.label,
    unit: source.unit,
    mode: 'none',
    goal: null,
    min: null,
    max: null,
    percentage: null,
    valid: false
  }
}

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function resolveGoal(source: SubDialProgressSourceMeta): SubDialProgressData {
  if (!isFiniteNumber(source.value) || !isFiniteNumber(source.goal) || source.goal <= 0) {
    return invalidProgress(source)
  }

  return {
    ...invalidProgress(source),
    mode: 'goal',
    goal: source.goal,
    percentage: (source.value / source.goal) * 100,
    valid: true
  }
}

function resolveRange(source: SubDialProgressSourceMeta, min: number | null | undefined, max: number | null | undefined): SubDialProgressData {
  if (!isFiniteNumber(source.value) || !isFiniteNumber(min) || !isFiniteNumber(max) || max <= min) {
    return invalidProgress(source)
  }

  return {
    ...invalidProgress(source),
    mode: 'range',
    min,
    max,
    percentage: ((source.value - min) / (max - min)) * 100,
    valid: true
  }
}

export function resolveSubDialProgress(source: SubDialProgressSourceMeta, options: SubDialProgressOptions): SubDialProgressData {
  if (options.mode === 'goal') return resolveGoal(source)
  if (options.mode === 'range') return resolveRange(source, source.min, source.max)
  if (options.mode === 'custom') return resolveRange(source, options.customMin, options.customMax)

  const goalProgress = resolveGoal(source)
  if (goalProgress.valid) return goalProgress

  return resolveRange(source, source.min, source.max)
}
