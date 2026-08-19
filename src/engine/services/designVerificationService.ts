import type { RuntimeDesignConfig } from '@/types/app/config'
import { normalizeDisplayStates } from '@/utils/displayStates'

export type DesignVerificationSeverity = 'error' | 'warning' | 'info'

export type DesignVerificationIssue = {
  code: 'missing-property' | 'ambient-hidden' | 'unused-property'
  severity: DesignVerificationSeverity
  message: string
  elementId?: string
  propertyKey?: string
}

export type DesignVerificationReport = {
  issues: DesignVerificationIssue[]
  summary: { errors: number; warnings: number; infos: number }
}

const BINDING_FIELDS = ['dataProperty', 'goalProperty', 'chartProperty', 'textProperty', 'dateProperty'] as const

/**
 * Performs Studio-only checks against the generated runtime configuration.
 * It deliberately has no SDK or network dependency so the result is immediate
 * and is safe to run while a design is being edited.
 */
export function verifyDesignConfig(config: Pick<RuntimeDesignConfig, 'properties' | 'elements'>): DesignVerificationReport {
  const issues: DesignVerificationIssue[] = []
  const elements = Array.isArray(config.elements) ? config.elements : []
  const properties = config.properties || {}
  const referenced = new Set<string>()

  for (const element of elements as unknown as Array<Record<string, unknown>>) {
    const elementId = String(element.id || '')
    for (const field of BINDING_FIELDS) {
      const key = String(element[field] || '').trim()
      if (!key) continue
      referenced.add(key)
      if (!properties[key]) {
        issues.push({
          code: 'missing-property',
          severity: 'error',
          elementId,
          propertyKey: key,
          message: `This element references missing app property "${key}".`,
        })
      }
    }

    const displayStates = normalizeDisplayStates(element.displayStates)
    if (displayStates.active && !displayStates.ambient) {
      issues.push({
        code: 'ambient-hidden',
        severity: 'warning',
        elementId,
        message: 'Visible in Active mode but hidden in Ambient/AOD mode. Confirm this is intentional.',
      })
    }
  }

  for (const [key, property] of Object.entries(properties)) {
    if (!referenced.has(key)) {
      issues.push({
        code: 'unused-property',
        severity: 'info',
        propertyKey: key,
        message: `App property "${String((property as any)?.title || key)}" is not used by an element.`,
      })
    }
  }

  const summary = { errors: 0, warnings: 0, infos: 0 }
  for (const issue of issues) {
    if (issue.severity === 'error') summary.errors += 1
    if (issue.severity === 'warning') summary.warnings += 1
    if (issue.severity === 'info') summary.infos += 1
  }
  return { issues, summary }
}

export type VerificationScenario = {
  id: 'normal' | 'midnight' | 'long-text' | 'missing-data' | 'low-battery' | 'ambient'
  name: string
  description: string
  mode: 'active' | 'ambient'
  time: Date
}

export function createVerificationScenarios(): VerificationScenario[] {
  return [
    { id: 'normal', name: 'Normal', description: 'Active display at a typical daytime value.', mode: 'active', time: new Date('2026-08-13T08:08:00') },
    { id: 'midnight', name: 'Midnight', description: 'Checks date/time at day rollover.', mode: 'active', time: new Date('2026-08-13T00:00:00') },
    { id: 'long-text', name: 'Long text', description: 'Use this when reviewing labels and localized content.', mode: 'active', time: new Date('2026-09-30T23:59:00') },
    { id: 'missing-data', name: 'Missing data', description: 'Review fallbacks for unavailable health or weather data.', mode: 'active', time: new Date('2026-08-13T08:08:00') },
    { id: 'low-battery', name: 'Low battery', description: 'Review priority and contrast in a low-battery state.', mode: 'active', time: new Date('2026-08-13T08:08:00') },
    { id: 'ambient', name: 'Ambient / AOD', description: 'Checks the low-power display state.', mode: 'ambient', time: new Date('2026-08-13T08:08:00') },
  ]
}
