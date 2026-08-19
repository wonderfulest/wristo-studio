import { describe, expect, it } from 'vitest'
import { verifyDesignConfig } from './designVerificationService'

describe('verifyDesignConfig', () => {
  it('reports a blocking issue when an element references a missing data property', () => {
    const report = verifyDesignConfig({
      properties: {},
      elements: [{ id: 'steps', eleType: 'data', dataProperty: 'data_1', displayStates: { active: true, ambient: true } }],
    } as any)

    expect(report.issues).toContainEqual(expect.objectContaining({
      severity: 'error',
      code: 'missing-property',
      elementId: 'steps',
    }))
  })

  it('warns when a visible active element is omitted from ambient mode', () => {
    const report = verifyDesignConfig({
      properties: {},
      elements: [{ id: 'seconds', eleType: 'time', displayStates: { active: true, ambient: false } }],
    } as any)

    expect(report.issues).toContainEqual(expect.objectContaining({
      severity: 'warning',
      code: 'ambient-hidden',
      elementId: 'seconds',
    }))
  })

  it('does not flag a property when its matching binding is present', () => {
    const report = verifyDesignConfig({
      properties: { data_1: { type: 'data', title: 'Steps' } },
      elements: [{ id: 'steps', eleType: 'data', dataProperty: 'data_1', displayStates: { active: true, ambient: true } }],
    } as any)

    expect(report.summary).toEqual({ errors: 0, warnings: 0, infos: 0 })
  })

  it('treats dateProperty as a first-class binding', () => {
    const valid = verifyDesignConfig({
      properties: { date_1: { type: 'date', title: 'Date 1', value: 31 } },
      elements: [{ id: 'date', eleType: 'date', dateProperty: 'date_1', displayStates: { active: true, ambient: true } }],
    } as any)
    const missing = verifyDesignConfig({
      properties: {},
      elements: [{ id: 'date', eleType: 'date', dateProperty: 'date_missing', displayStates: { active: true, ambient: true } }],
    } as any)

    expect(valid.summary).toEqual({ errors: 0, warnings: 0, infos: 0 })
    expect(missing.issues).toContainEqual(expect.objectContaining({ code: 'missing-property', propertyKey: 'date_missing' }))
  })
})
