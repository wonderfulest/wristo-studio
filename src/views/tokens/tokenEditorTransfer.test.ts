// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { applyTokenEditorSession, createTokenEditorSession, readTokenEditorSession, tokenEditorResultStorageKey } from './tokenEditorTransfer'

describe('token editor cross-tab session', () => {
  beforeEach(() => localStorage.clear())

  it('passes the current template to the token page and applies the edited value once', () => {
    const onApply = vi.fn()
    const session = createTokenEditorSession({ value: '((ds3.3) / 86400).format("%.1f") + "d"', appLanguage: 'eng' }, onApply, { sessionId: 'session-1' })

    expect(readTokenEditorSession('session-1')).toEqual({
      value: '((ds3.3) / 86400).format("%.1f") + "d"',
      appLanguage: 'eng'
    })

    applyTokenEditorSession('session-1', '(tm1).format("%04d")')
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: tokenEditorResultStorageKey('session-1'),
        newValue: '(tm1).format("%04d")',
        storageArea: localStorage
      })
    )

    expect(onApply).toHaveBeenCalledOnce()
    expect(onApply).toHaveBeenCalledWith('(tm1).format("%04d")')
    expect(readTokenEditorSession('session-1')).toBeNull()

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: tokenEditorResultStorageKey('session-1'),
        newValue: 'ignored',
        storageArea: localStorage
      })
    )
    expect(onApply).toHaveBeenCalledOnce()

    session.dispose()
  })

  it('ignores malformed or unknown sessions', () => {
    localStorage.setItem('wristo:token-editor:bad:input', '{not-json')

    expect(readTokenEditorSession('missing')).toBeNull()
    expect(readTokenEditorSession('bad')).toBeNull()
    expect(() => applyTokenEditorSession('', 'value')).not.toThrow()
  })
})
