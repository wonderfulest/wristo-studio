import { beforeEach, describe, expect, it, vi } from 'vitest'
import { showErrorOnce } from './errorMessage'

vi.mock('element-plus', () => ({ ElMessage: { error: vi.fn() } }))
import { ElMessage } from 'element-plus'

describe('error notifications', () => {
  beforeEach(() => { vi.clearAllMocks() })
  it('keeps the original reason when a caller handles the same rejection', () => {
    const error = Object.freeze({ code: 500, msg: 'Contact the team' })
    showErrorOnce(error, error.msg)
    showErrorOnce(error, 'Submission failed')
    expect(ElMessage.error).toHaveBeenCalledTimes(1)
    expect(ElMessage.error).toHaveBeenCalledWith('Contact the team')
  })
  it('still reports independent failures and local errors', () => {
    showErrorOnce(new Error('first'), 'Upload failed')
    showErrorOnce(new Error('second'), 'Upload failed')
    showErrorOnce(undefined, 'Validation failed')
    expect(ElMessage.error).toHaveBeenCalledTimes(3)
  })
  it('reports a suppressed request when its caller supplies a message', () => {
    const error = { code: 409 }
    showErrorOnce(error, 'Choose a different name')
    expect(ElMessage.error).toHaveBeenCalledWith('Choose a different name')
  })
})
