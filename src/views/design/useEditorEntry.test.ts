import { effectScope, nextTick, reactive } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useEditorEntry } from './useEditorEntry'

const mocks = vi.hoisted(() => ({ createDesign: vi.fn(), user: { canCreateDesign: true }, replace: vi.fn() }))
vi.mock('@/api/wristo/design', () => ({ designApi: { createDesign: mocks.createDesign } }))
vi.mock('@/stores/user', () => ({ useUserStore: () => mocks.user }))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.user.canCreateDesign = true
  mocks.createDesign.mockResolvedValue({ code: 0, data: { designUid: 'created-design' } })
  mocks.replace.mockResolvedValue(undefined)
})
function setup(id = '', recovery: Record<string, any> = {}) {
  const scope = effectScope()
  const route = reactive({ query: { id }, path: '/design' })
  const load = vi.fn().mockResolvedValue(undefined)
  const flush = vi.fn().mockResolvedValue(undefined)
  const entry = scope.run(() => useEditorEntry({ route, replace: mocks.replace, load, flush, currentId: () => '', ...recovery }))!
  return { scope, route, load, flush, ...entry }
}
describe('direct Studio entry', () => {
  it('loads the supplied design without creating another project', async () => {
    const s = setup('existing-id')
    await s.open()
    expect(s.load).toHaveBeenCalledWith('existing-id')
    expect(mocks.createDesign).not.toHaveBeenCalled()
    s.scope.stop()
  })
  it('creates one blank project and replaces the URL before loading it', async () => {
    const s = setup()
    await Promise.all([s.open(), s.open()])
    expect(mocks.createDesign).toHaveBeenCalledTimes(1)
    expect(mocks.createDesign).toHaveBeenCalledWith({ name: 'Untitled', description: '', originalType: 'original' })
    expect(mocks.replace).toHaveBeenCalledWith({ path: '/design', query: { id: 'created-design' } })
    s.route.query.id = 'created-design'
    await nextTick()
    await vi.waitFor(() => expect(s.load).toHaveBeenCalledWith('created-design'))
    s.scope.stop()
  })
  it('keeps creation failures in the editor and allows retry', async () => {
    mocks.createDesign.mockRejectedValueOnce(new Error('Service unavailable'))
    const s = setup()
    await s.open()
    expect(s.error.value).toBe('Service unavailable')
    expect(mocks.replace).not.toHaveBeenCalled()
    await s.open()
    expect(mocks.replace).toHaveBeenCalledOnce()
    s.scope.stop()
  })
  it('respects membership limits without creating an empty cloud record', async () => {
    mocks.user.canCreateDesign = false
    const s = setup()
    await s.open()
    expect(s.error.value).toContain('limit')
    expect(mocks.createDesign).not.toHaveBeenCalled()
    s.scope.stop()
  })
  it('does not navigate when creation finishes after leaving the editor', async () => {
    let finish!: (value: unknown) => void
    mocks.createDesign.mockImplementation(() => new Promise(resolve => { finish = resolve }))
    const s = setup()
    const pending = s.open()
    await vi.waitFor(() => expect(mocks.createDesign).toHaveBeenCalledOnce())
    s.scope.stop()
    finish({ code: 0, data: { designUid: 'created-design' } })
    await pending
    expect(mocks.replace).not.toHaveBeenCalled()
  })
})

describe('unsaved Studio entry', () => {
  it.each(['resume', 'new', 'dismiss'])('handles %s without implicit creation', async (choice) => {
    const draft = { designId: 'previous', name: 'My draft', savedAt: 10 }
    const choose = vi.fn().mockResolvedValue(choice)
    const s = setup('', { findUnsaved: () => draft, chooseUnsaved: choose })
    await s.open()
    expect(choose).toHaveBeenCalledWith(draft)
    expect(mocks.createDesign).toHaveBeenCalledTimes(choice === 'new' ? 1 : 0)
    expect(mocks.replace).toHaveBeenCalledWith(choice === 'dismiss' ? '/designs' : { path: '/design', query: { id: choice === 'resume' ? 'previous' : 'created-design' } })
    s.scope.stop()
  })
  it('can resume when project creation is disallowed', async () => {
    mocks.user.canCreateDesign = false
    const s = setup('', { findUnsaved: () => ({ designId: 'previous' }), chooseUnsaved: async () => 'resume' })
    await s.open()
    expect(mocks.replace).toHaveBeenCalledWith({ path: '/design', query: { id: 'previous' } })
    expect(s.error.value).toBe('')
    s.scope.stop()
  })
  it('bypasses the choice for an explicit design link', async () => {
    const findUnsaved = vi.fn()
    const s = setup('explicit', { findUnsaved })
    await s.open()
    expect(findUnsaved).not.toHaveBeenCalled()
    s.scope.stop()
  })
  it('does not create after leaving while the dialog is open', async () => {
    let choose!: (value: string) => void
    const s = setup('', { findUnsaved: () => ({ designId: 'previous' }), chooseUnsaved: () => new Promise(resolve => { choose = resolve }) })
    const pending = s.open()
    await vi.waitFor(() => expect(choose).toBeTypeOf('function'))
    s.scope.stop()
    choose('new')
    await pending
    expect(mocks.createDesign).not.toHaveBeenCalled()
  })
})

it('records new projects and flushes changes before looking for drafts', async () => {
  const onCreated = vi.fn()
  const findUnsaved = vi.fn()
  const s = setup('', { onCreated, findUnsaved })
  await s.open()
  expect(s.flush.mock.invocationCallOrder[0]).toBeLessThan(findUnsaved.mock.invocationCallOrder[0])
  expect(onCreated).toHaveBeenCalledWith('created-design')
  s.scope.stop()
})
it('keeps the current design when closing the entry dialog', async () => {
  const s = setup('', { currentId: () => 'current', findUnsaved: () => ({ designId: 'current' }), chooseUnsaved: async () => 'dismiss' })
  await s.open()
  expect(mocks.replace).toHaveBeenCalledWith({ path: '/design', query: { id: 'current' } })
  expect(mocks.createDesign).not.toHaveBeenCalled()
  s.scope.stop()
})
