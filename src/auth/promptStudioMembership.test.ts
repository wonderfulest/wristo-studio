import { describe, expect, it, vi } from 'vitest'
import { promptStudioMembership } from './promptStudioMembership'

describe('Studio membership prompt', () => {
  it('waits for explicit confirmation before navigating to membership', async () => {
    let confirm!: () => void
    const decision = new Promise<void>(resolve => { confirm = resolve })
    const navigate = vi.fn()
    const onCancel = vi.fn()
    const pending = promptStudioMembership({ confirm: () => decision, navigate, onCancel })
    expect(navigate).not.toHaveBeenCalled()
    confirm()
    await pending
    expect(navigate).toHaveBeenCalledWith('https://www.wristo.io/membership')
    expect(onCancel).not.toHaveBeenCalled()
  })

  it.each(['cancel', 'close'])('does not navigate to membership on %s', async action => {
    const navigate = vi.fn()
    const onCancel = vi.fn()
    await promptStudioMembership({ confirm: () => Promise.reject(action), navigate, onCancel })
    expect(navigate).not.toHaveBeenCalled()
    expect(onCancel).toHaveBeenCalledOnce()
  })
})
