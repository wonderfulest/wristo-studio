import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetStudioUnitTraceForTests, traceStudioUnit } from './studioUnitTrace'

describe('Studio Unit trace', () => {
  beforeEach(() => {
    resetStudioUnitTraceForTests()
  })

  it('logs the first state and only logs again when that state changes', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)

    traceStudioUnit('unit-1', 'simulator-write', { text: '' })
    traceStudioUnit('unit-1', 'simulator-write', { text: '' })
    traceStudioUnit('unit-1', 'simulator-write', { text: '°C' })

    expect(info).toHaveBeenCalledTimes(2)
    expect(info).toHaveBeenNthCalledWith(1, '[StudioUnitTrace] simulator-write {"elementId":"unit-1","text":""}')
    expect(info).toHaveBeenNthCalledWith(2, '[StudioUnitTrace] simulator-write {"elementId":"unit-1","text":"°C"}')
    info.mockRestore()
  })
})
