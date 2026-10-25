// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'
import DesignCard from './DesignCard.vue'
vi.mock('@/stores/user', () => ({ useUserStore: () => ({ userInfo: { device: { deviceId: 'venu3' } }, studioMembership: null }) }))
vi.mock('@/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('@/views/meter/AppDetail.vue', () => ({ default: { template: '<div />' } }))
const design = { id: 1, name: 'Test face', designUid: 'one', designStatus: 'draft' as const, createdAt: 1, updatedAt: 2, user: { id: 7, username: 'Creator' }, product: { id: 10, appId: 211889, name: 'Test face', release: { id: 2, packageUrl: 'https://example.com/test.iq', updatedAt: 1 } } }
const props = { design, showPackageDownload: true, isMerchantUser: true, isAdminUser: true, canDeleteDesign: true, showCreator: true, loadingStates: { submit: new Set<number>(), copy: new Set<number>(), delete: new Set<number>(), favorite: new Set<number>(), prgBuild: new Set<number>(), previewPrg: new Set<number>() }, currentUserId: 7, statusText: 'Draft', statusColor: '#999', lastGoLiveText: 'Never', creatorName: 'Creator', designImageUrl: '/preview.png', hasNewRelease: false, hasDownloadablePackage: true }
const stubs = {
  ElCard: { template: '<article><header><slot name="header" /></header><slot /></article>' },
  ElButton: { template: '<button><slot /></button>' },
  ElTooltip: { template: '<span><slot /></span>' },
  ElIcon: { template: '<span><slot /></span>' },
  ElPopover: true, ElDrawer: true, ElInputNumber: true, Icon: true,
}
async function setup(extra: Record<string, unknown> = {}) {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }] })
  await router.push('/designs')
  const wrapper = mount(DesignCard, { props: { ...props, ...extra }, global: { plugins: [router], stubs } })
  return { wrapper, router }
}
describe('design card management placement', () => {
  it('keeps list cards read-only with links to the application details', async () => {
    const { wrapper, router } = await setup({ summaryOnly: true })
    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('View details')
    expect(wrapper.find('.store-weight-editor').exists()).toBe(false)
    expect(wrapper.find('.package-info').exists()).toBe(true)
    expect(wrapper.get('a[download]').attributes('href')).toBe(design.product.release.packageUrl)
    await wrapper.get('a.title').trigger('click')
    await router.isReady()
    expect(wrapper.get('a.title').attributes('href')).toBe('/faces/211889')
    wrapper.unmount()
  })
  it('shows downloads and both package links without unrelated list metadata', async () => {
    const { wrapper } = await setup({ summaryOnly: true, viewMode: 'list', design: {
      ...design, product: { ...design.product, download: 42,
        prgRelease: { id: 3, deviceId: 'venu3', prgUrl: 'https://example.com/test.prg', updatedAt: 1 },
      },
    } })
    expect(wrapper.get('.summary-downloads').text()).toContain('42')
    expect(wrapper.findAll('a[download]').map(link => link.attributes('href'))).toEqual([
      'https://example.com/test.prg', 'https://example.com/test.iq',
    ])
    expect(wrapper.find('.list-subtitle').exists()).toBe(false)
    expect(wrapper.find('.app-ops-entry').exists()).toBe(false)
    wrapper.unmount()
  })
  it('links a draft without an application to its own management detail route', async () => {
    const { wrapper } = await setup({ summaryOnly: true, design: { ...design, product: undefined } })
    expect(wrapper.get('a.title').attributes('href')).toBe('/designs/one')
    wrapper.unmount()
  })
  it('puts actions on the left and application metadata in the information target', async () => {
    const target = document.createElement('div'); document.body.append(target)
    const { wrapper } = await setup({ management: true, informationTarget: target })
    expect(wrapper.find('.actions-toggle').exists()).toBe(false)
    expect(wrapper.find('.action-group-build').exists()).toBe(true)
    expect(wrapper.find('.action-group-release').exists()).toBe(true)
    expect(wrapper.find('.action-group-manage').exists()).toBe(true)
    expect(wrapper.find('.package-info').exists()).toBe(false)
    expect(target.querySelector('.package-info')).not.toBeNull()
    expect(target.querySelector('.store-weight-editor')).not.toBeNull()
    const build = wrapper.findAll('button').find(button => button.text().includes('card.buildPrg'))!
    await build.trigger('click')
    expect(wrapper.emitted('build-prg')?.[0]).toEqual([design])
    wrapper.unmount(); target.remove()
  })
})
