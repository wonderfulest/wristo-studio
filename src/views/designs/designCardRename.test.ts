import { describe, expect, it } from 'vitest'
import { resolveDesignRename } from './designCardRename'

describe('resolveDesignRename', () => {
  it('trims a changed name and submits it', () => {
    expect(resolveDesignRename('  New name  ', 'Old name')).toEqual({
      action: 'submit',
      name: 'New name',
    })
  })

  it('restores the current name when the draft is empty', () => {
    expect(resolveDesignRename('   ', 'Old name')).toEqual({
      action: 'cancel',
      name: 'Old name',
    })
  })

  it('does not submit an unchanged trimmed name', () => {
    expect(resolveDesignRename(' Old name ', 'Old name')).toEqual({
      action: 'cancel',
      name: 'Old name',
    })
  })
})
