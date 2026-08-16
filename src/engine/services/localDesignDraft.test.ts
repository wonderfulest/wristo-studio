import { describe, expect, it, vi } from 'vitest'
import {
  buildLocalDesignDraftKey,
  createLocalDesignDraftAutosave,
  readLocalDesignDraft,
  removeLocalDesignDraft,
  resolveLocalDesignDraft,
  writeLocalDesignDraft,
} from './localDesignDraft'

class MemoryStorage implements Storage {
  private values = new Map<string, string>()
  get length(): number { return this.values.size }
  clear(): void { this.values.clear() }
  getItem(key: string): string | null { return this.values.get(key) ?? null }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null }
  removeItem(key: string): void { this.values.delete(key) }
  setItem(key: string, value: string): void { this.values.set(key, value) }
}

describe('localDesignDraft', () => {
  it('isolates drafts by design and device', () => {
    expect(buildLocalDesignDraftKey('design-a', 'fr965')).not.toBe(
      buildLocalDesignDraftKey('design-a', 'fenix7'),
    )
    expect(buildLocalDesignDraftKey('design-a', 'fr965')).not.toBe(
      buildLocalDesignDraftKey('design-b', 'fr965'),
    )
  })

  it('writes, reads, and removes a complete local draft', () => {
    const storage = new MemoryStorage()
    writeLocalDesignDraft(storage, {
      designId: 'design-a',
      deviceKey: 'fr965',
      savedAt: 123,
      config: { designId: 'design-a', elements: [{ id: 'time' }] } as any,
    })

    expect(readLocalDesignDraft(storage, 'design-a', 'fr965')).toMatchObject({
      savedAt: 123,
      config: { elements: [{ id: 'time' }] },
    })

    removeLocalDesignDraft(storage, 'design-a', 'fr965')
    expect(readLocalDesignDraft(storage, 'design-a', 'fr965')).toBeNull()
  })

  it('skips saving until a canvas mutation marks the draft dirty', () => {
    const save = vi.fn()
    const autosave = createLocalDesignDraftAutosave(save)

    expect(autosave.saveIfDirty()).toBe(false)
    expect(save).not.toHaveBeenCalled()

    autosave.markDirty()
    expect(autosave.saveIfDirty()).toBe(true)
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('coalesces repeated mutations and saves again only after another mutation', () => {
    const save = vi.fn()
    const autosave = createLocalDesignDraftAutosave(save)

    autosave.markDirty()
    autosave.markDirty()
    autosave.markDirty()
    autosave.saveIfDirty()
    autosave.saveIfDirty()
    expect(save).toHaveBeenCalledTimes(1)

    autosave.markDirty()
    autosave.saveIfDirty()
    expect(save).toHaveBeenCalledTimes(2)
  })

  it('can mark pending changes clean after a successful server save', () => {
    const save = vi.fn()
    const autosave = createLocalDesignDraftAutosave(save)
    autosave.markDirty()

    autosave.markClean()

    expect(autosave.saveIfDirty()).toBe(false)
    expect(save).not.toHaveBeenCalled()
  })

  it('keeps the draft dirty when persistence fails so a later tick can retry', () => {
    const save = vi.fn()
      .mockImplementationOnce(() => { throw new Error('quota exceeded') })
      .mockImplementationOnce(() => undefined)
    const autosave = createLocalDesignDraftAutosave(save)

    autosave.markDirty()
    expect(() => autosave.saveIfDirty()).toThrow('quota exceeded')
    expect(autosave.saveIfDirty()).toBe(true)
    expect(save).toHaveBeenCalledTimes(2)
  })

  it('restores the local config when the user accepts the recovery prompt', async () => {
    const storage = new MemoryStorage()
    const localConfig = { designId: 'design-a', elements: [{ id: 'local' }] } as any
    writeLocalDesignDraft(storage, {
      designId: 'design-a', deviceKey: 'fr965', savedAt: 123, config: localConfig,
    })

    const resolved = await resolveLocalDesignDraft({
      storage,
      designId: 'design-a',
      deviceKey: 'fr965',
      serverConfig: { designId: 'design-a', elements: [{ id: 'server' }] } as any,
      confirmRestore: vi.fn().mockResolvedValue(true),
    })

    expect(resolved).toEqual(localConfig)
    expect(readLocalDesignDraft(storage, 'design-a', 'fr965')).not.toBeNull()
  })

  it('uses the server config and clears the draft when recovery is declined', async () => {
    const storage = new MemoryStorage()
    const serverConfig = { designId: 'design-a', elements: [{ id: 'server' }] } as any
    writeLocalDesignDraft(storage, {
      designId: 'design-a', deviceKey: 'fr965', savedAt: 123,
      config: { designId: 'design-a', elements: [{ id: 'local' }] } as any,
    })

    const resolved = await resolveLocalDesignDraft({
      storage, designId: 'design-a', deviceKey: 'fr965', serverConfig,
      confirmRestore: vi.fn().mockResolvedValue(false),
    })

    expect(resolved).toBe(serverConfig)
    expect(readLocalDesignDraft(storage, 'design-a', 'fr965')).toBeNull()
  })
})
