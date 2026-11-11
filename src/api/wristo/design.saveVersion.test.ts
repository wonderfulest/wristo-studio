import { beforeEach, expect, it, vi } from 'vitest'
const { post, get } = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }))
vi.mock('@/config/axios', () => ({ default: { post, get } }))
import { designApi } from './design'
import { rememberDesignSaveVersion, getDesignSaveVersion } from '@/engine/services/designSaveVersion'
beforeEach(() => { vi.clearAllMocks(); rememberDesignSaveVersion('d', 21) })
it('sends loaded version and advances it only after successful save', async () => {
  post.mockResolvedValueOnce({ code: 0, data: { designUid: 'd', version: 22 } })
  await designApi.updateDesign({ uid: 'd', configJson: {} })
  expect(post).toHaveBeenLastCalledWith('/dsn/design/update', expect.objectContaining({ expectedVersion: 21 }))
  expect(getDesignSaveVersion('d')).toBe(22)
  post.mockResolvedValueOnce({ code: 1, msg: 'conflict' })
  await designApi.updateDesign({ uid: 'd', configJson: {} })
  expect(getDesignSaveVersion('d')).toBe(22)
})
it('does not upgrade the edit baseline from unrelated detail reads', async () => {
  get.mockResolvedValue({ code: 0, data: { designUid: 'd', version: 99 } })
  await designApi.getDesignByUid('d')
  expect(getDesignSaveVersion('d')).toBe(21)
})
it('checks metadata saves too so later saves use the correct version', async () => {
  post.mockResolvedValue({ code: 0, data: { designUid: 'd', version: 22 } })
  await designApi.updateDesign({ uid: 'd', name: 'Face' })
  expect(post).toHaveBeenLastCalledWith('/dsn/design/update', expect.objectContaining({ expectedVersion: 21 }))
  expect(getDesignSaveVersion('d')).toBe(22)
})
it('preserves an explicitly captured version and keeps different projects isolated', async () => {
  rememberDesignSaveVersion('other', 5)
  post.mockResolvedValue({ code: 1 })
  await designApi.updateDesign({ uid: 'd', expectedVersion: 20, configJson: {} })
  expect(post).toHaveBeenLastCalledWith('/dsn/design/update', expect.objectContaining({ expectedVersion: 20 }))
  expect(getDesignSaveVersion('other')).toBe(5)
})

it('records the returned version after the first save of a newly created design', async () => {
  rememberDesignSaveVersion('new', undefined)
  post.mockResolvedValue({ code: 0, data: { designUid: 'new', version: 1 } })
  await designApi.updateDesign({ uid: 'new', configJson: {} })
  expect(getDesignSaveVersion('new')).toBe(1)
})
