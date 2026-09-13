import { beforeEach, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
vi.mock('element-plus', () => ({ ElMessage: vi.fn() }))
import { ElMessage } from 'element-plus'
import { useMessageStore } from './message'

beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks() })
it('routes legacy messages through the shared notification renderer', () => {
  const store = useMessageStore()
  store.error('Failure', 5000)
  store.success('Saved')
  expect(ElMessage).toHaveBeenNthCalledWith(1, { message: 'Failure', type: 'error', duration: 5000 })
  expect(ElMessage).toHaveBeenNthCalledWith(2, { message: 'Saved', type: 'success', duration: 3000 })
})
