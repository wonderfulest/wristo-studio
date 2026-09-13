import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AxiosError, type AxiosAdapter } from 'axios'
vi.mock('element-plus', () => ({ ElMessage: { error: vi.fn() } }))
vi.mock('@/stores/user', () => ({ useUserStore: () => ({ token: '', clearAuth: vi.fn() }) }))
vi.mock('@/stores/locale', () => ({ useLocaleStore: () => ({ currentLocale: 'en' }) }))
vi.mock('@/i18n', () => ({ translate: (key: string) => key }))
vi.mock('@/utils/ssoRedirect', () => ({ cancelPendingSsoRedirect: vi.fn(), clearLocalAuthState: vi.fn(), redirectToSsoLogin: vi.fn() }))
import { ElMessage } from 'element-plus'
import instance from './axios'
import { showErrorOnce } from '@/utils/errorMessage'

const adapterFor = (code: number): AxiosAdapter => async config => ({
  data: { code, msg: 'Specific failure' }, status: 200, statusText: 'OK', headers: {}, config,
})
async function submit(adapter: AxiosAdapter, suppressBusinessErrorCodes?: number[]) {
  try {
    await instance.post('/test-submit', {}, { adapter, suppressBusinessErrorCodes, suppressForbiddenRedirect: true })
  } catch (error) {
    showErrorOnce(error, 'Submission failed')
  }
}
describe('request and caller error notification ownership', () => {
  beforeEach(() => { vi.clearAllMocks() })
  it.each([500, 401, 403])('reports business error %s exactly once', async code => {
    await submit(adapterFor(code))
    expect(ElMessage.error).toHaveBeenCalledTimes(1)
    expect(ElMessage.error).toHaveBeenCalledWith('Specific failure')
  })
  it.each([500, 401, 403, undefined])('reports HTTP/network error %s exactly once', async status => {
    await submit(async config => {
      throw new AxiosError('Request failed', 'ERR_NETWORK', config, undefined, status ? {
        data: { msg: 'Specific failure' }, status, statusText: 'Error', headers: {}, config,
      } : undefined)
    })
    expect(ElMessage.error).toHaveBeenCalledTimes(1)
    expect(ElMessage.error).toHaveBeenCalledWith(status ? 'Specific failure' : 'auth.networkError')
  })
  it('lets the caller handle explicitly suppressed business errors', async () => {
    await submit(adapterFor(409), [409])
    expect(ElMessage.error).toHaveBeenCalledTimes(1)
    expect(ElMessage.error).toHaveBeenCalledWith('Submission failed')
  })
})
