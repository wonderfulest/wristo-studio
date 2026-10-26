// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'
import DesignCard from './DesignCard.vue'
vi.mock('@/api/wristo/platformVersions', () => ({ loadAppBuildVersion: vi.fn().mockResolvedValue('2.10.0') }))
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
  ElPopover: { template: '<div><slot name="reference"/><slot/></div>' }, ElDrawer: true, ElInputNumber: true, Icon: true,
}
async function setup(extra: Record<string, unknown> = {}) {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }] })
  await router.push('/designs')
  const wrapper = mount(DesignCard, { props: { ...props, ...extra }, global: { plugins: [router], stubs } })
  return { wrapper, router }
}
describe('design card management placement', () => {
  it.each([['2.9.4', true], ['2.10.0', false], ['3.0.0', false], [undefined, false]])('shows a gentle rebuild hint only for older packages: %s', async (releaseVersion, expected) => {
    const { wrapper } = await setup({ management: true, design: { ...design, product: { ...design.product, release: { ...design.product.release, releaseVersion } } } })
    await flushPromises()
    expect(wrapper.find('.iq-build-action .build-version-hint').exists()).toBe(expected)
    expect(wrapper.find('.build-task-status .build-version-hint').exists()).toBe(false)
    wrapper.unmount()
  })

  it('navigates Publish to the application detail publishing section', async () => {
    const { wrapper, router } = await setup()
    await wrapper.findAll('button').find(button => button.text() === 'card.publish')!.trigger('click')
    await router.isReady()
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(router.currentRoute.value.fullPath).toBe('/faces/211889?section=distribution')
    expect(wrapper.emitted('go-live')).toBeUndefined()
    wrapper.unmount()
  })

  it.each([
    ['creator', 7, false, true],
    ['administrator', 8, true, true],
    ['other merchant', 8, false, false],
    ['visitor', null, false, false],
    ['unprivileged user 1', 1, false, false],
  ])('shows IQ build only for authorized users: %s', async (_, currentUserId, isAdminUser, visible) => {
    const { wrapper } = await setup({ management: true, currentUserId, isAdminUser })
    expect(wrapper.get('.permanent-build-actions').text().includes('card.buildIq')).toBe(visible)
    expect(wrapper.get('.permanent-build-actions').text()).toContain('card.buildPrg')
    wrapper.unmount()
  })

  it('shows the creator on summary grid previews and responds to the toggle', async () => {
    const { wrapper } = await setup({ summaryOnly: true, viewMode: 'grid' })
    expect(wrapper.get('.design-background .creator-badge').text()).toBe('Creator')
    expect(wrapper.find('.payment-badge').exists()).toBe(false)
    await wrapper.setProps({ showCreator: false })
    expect(wrapper.find('.card-badges').exists()).toBe(false)
    await wrapper.setProps({ showCreator: true })
    expect(wrapper.get('.design-background .creator-badge').text()).toBe('Creator')
    wrapper.unmount()
  })

  it('shows the last package versions independently while new tasks are queued', async () => {
    const { wrapper } = await setup({ summaryOnly: true, design: {
      ...design, product: { ...design.product,
        release: { ...design.product.release, releaseVersion: '1.10.0' },
        prgRelease: { id: 3, deviceId: 'venu3', prgUrl: 'https://example.com/test.prg', releaseVersion: '2.3.0' },
        prgPackagingLog: { deviceId: 'venu3', packagingStatus: 'pending', rank: 8 },
        packagingLog: { packagingStatus: 'pending', rank: 5 },
      },
    } })
    const rows = wrapper.findAll('.summary-meta .package-info-item')
    expect(rows[0].get('.package-version').text()).toBe('2.3.0')
    expect(rows[1].get('.package-version').text()).toBe('1.10.0')
    expect(rows.every(row => row.text().includes('card.position'))).toBe(true)
    await wrapper.setProps({ design })
    expect(wrapper.find('.package-version').exists()).toBe(false)
    wrapper.unmount()
  })

  it('downloads completed PRG and IQ packages from the visible build status rows', async () => {
    const { wrapper } = await setup({ management: true, design: {
      ...design, product: { ...design.product,
        prgRelease: { id: 3, deviceId: 'venu3', prgUrl: 'https://example.com/test.prg' },
        prgPackagingLog: { deviceId: 'venu3', packagingStatus: 'completed' },
        packagingLog: { packagingStatus: 'completed' },
      },
    } })
    const buttons = wrapper.findAll('.build-task-download')
    expect(buttons).toHaveLength(2)
    await buttons[0].trigger('click')
    await buttons[1].trigger('click')
    expect(wrapper.emitted('run-prg')?.[0]).toEqual([wrapper.props('design')])
    expect(wrapper.emitted('download-package')?.[0]).toEqual([wrapper.props('design')])
    await wrapper.setProps({ showPackageDownload: false })
    expect(wrapper.find('.build-task-download').exists()).toBe(false)
    wrapper.unmount()
  })
  it('does not offer downloads for completed tasks without files', async () => {
    const { wrapper } = await setup({ management: true, design: {
      ...design, product: { ...design.product, release: undefined,
        prgPackagingLog: { deviceId: 'venu3', packagingStatus: 'completed' },
        packagingLog: { packagingStatus: 'completed' },
      },
    } })
    expect(wrapper.findAll('.build-task-row')).toHaveLength(2)
    expect(wrapper.find('.build-task-download').exists()).toBe(false)
    wrapper.unmount()
  })
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
  it('keeps build actions outside the collapsed versions area and removes obsolete management entries', async () => {
    const target = document.createElement('div'); document.body.append(target)
    const { wrapper } = await setup({ management: true, informationTarget: target })
    const details = wrapper.get('details')
    expect(details.attributes('open')).toBeUndefined()
    const build = wrapper.get('.permanent-build-actions')
    expect(build.element.closest('details')).toBeNull()
    expect(details.text()).not.toContain('card.buildPrg')
    expect(details.text()).not.toContain('card.buildIq')
    expect(details.text()).not.toContain('editDesign.downloadPackage')
    expect(details.text()).not.toContain('Packages')
    expect(wrapper.text()).not.toContain('Rename')
    expect(wrapper.text()).not.toContain('editDesign.title')
    const iq = build.findAll('button').find(button => button.text().includes('card.buildIq'))!
    await iq.trigger('click')
    expect(wrapper.emitted('submit')?.[0]).toEqual([design])
    await wrapper.setProps({ design: { ...design, product: { ...design.product, packagingLog: { rank: 0 } } } as any })
    expect(iq.attributes('disabled')).toBeDefined()
    expect(build.text()).toContain('card.buildIq')
    wrapper.unmount(); target.remove()
  })
  it.each([
    ['pending', 3, 'card.position', 'pending'],
    ['processing', null, 'card.packaging', 'pending'],
    ['completed', 0, 'card.packageCompleted', 'ready'],
    ['failed', null, 'card.packageFailed', 'failed'],
  ])('shows %s beside build actions even with an older release', async (status, rank, text, tone) => {
    const target = document.createElement('div'); document.body.append(target)
    const { wrapper } = await setup({ management: true, informationTarget: target, design: {
      ...design, product: { ...design.product,
        prgPackagingLog: { id: 9, deviceId: 'venu3', packagingStatus: status, rank, createdAt: 1 },
        prgRelease: { id: 3, deviceId: 'venu3', prgUrl: 'https://example.com/old.prg' },
      },
    } })
    const row = wrapper.get('.permanent-build-actions .build-task-row')
    expect(row.text()).toContain('PRG')
    expect(row.text()).toContain(text)
    expect(row.classes()).toContain('package-' + tone)
    expect(row.find('.build-task-download').exists()).toBe(status === 'completed')
    expect(wrapper.find('.permanent-build-actions > .action-group-actions').text()).not.toContain('card.cancelPrgBuild')
    const cancel = row.find('.build-task-cancel')
    expect(cancel.exists()).toBe(status === 'pending')
    if (cancel.exists()) {
      await cancel.trigger('click')
      expect(wrapper.emitted('cancel-prg')?.[0]).toEqual([wrapper.props('design')])
    }
    wrapper.unmount(); target.remove()
  })
  it.each([
    ['pending', 599999, false],
    ['pending', 600000, true],
    ['init', 600000, true],
    ['cancel_requested', 600000, false],
    ['complete', 600000, false],
    ['failed', 600000, false],
    ['cancelled', 600000, false],
  ])('IQ %s at age %d has cancellation=%s', async (status, age, canCancel) => {
    const { wrapper } = await setup({ management: true, nowMs: 1000000, design: {
      ...design, product: { ...design.product,
        packagingLog: { id: 12, packagingStatus: status, rank: 5, createdAt: 1000000 - age },
      },
    } })
    const row = wrapper.get('.permanent-build-actions .build-task-row')
    expect(row.text()).toContain('IQ')
    const cancel = row.find('.build-task-cancel')
    expect(cancel.exists()).toBe(canCancel)
    if (canCancel) {
      await cancel.trigger('click')
      expect(wrapper.emitted('cancel-iq')?.[0]).toEqual([wrapper.props('design')])
      expect(wrapper.emitted('cancel-prg')).toBeUndefined()
    }
    wrapper.unmount()
  })
  it('shows manual processing ahead of the retained queue position', async () => {
    const target = document.createElement('div'); document.body.append(target)
    const { wrapper } = await setup({ management: true, informationTarget: target, design: {
      ...design, product: { ...design.product,
        prgPackagingLog: { id: 9, deviceId: 'venu3', packagingStatus: 'init', rank: 8,
          processingStartedAt: '2026-10-25T03:14:00Z', processingFinishedAt: null },
      },
    } })
    expect(wrapper.get('.build-task-row').text()).toContain('card.packaging')
    await wrapper.setProps({ design: { ...design, product: { ...design.product,
      prgPackagingLog: { id: 9, deviceId: 'venu3', packagingStatus: 'complete', rank: 8,
        processingStartedAt: '2026-10-25T03:14:00Z', processingFinishedAt: '2026-10-25T03:15:00Z' },
    } } as any })
    expect(wrapper.get('.build-task-row').text()).toContain('card.packageCompleted')
    wrapper.unmount(); target.remove()
  })
  it('puts actions on the left and application metadata in the information target', async () => {
    const target = document.createElement('div'); document.body.append(target)
    const { wrapper } = await setup({ management: true, informationTarget: target })
    expect(wrapper.find('.actions-toggle').exists()).toBe(false)
    expect(wrapper.find('.action-group-build').exists()).toBe(true)
    expect(wrapper.find('.action-group-release').exists()).toBe(false)
    expect(wrapper.get('.build-task-publish').element.closest('.build-task-row')?.textContent).toContain('IQ')
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

it('renders timing beneath the build status and updates when the task finishes', async () => {
  const task = { id: 9, deviceId: 'venu3', packagingStatus: 'pending', rank: 0,
    createdAt: 1, processingStartedAt: 965000,
    timeEstimate: { durationMs: 95000, waitMs: null, calculatedAt: 1000000 } }
  const { wrapper } = await setup({ management: true, nowMs: 1000000,
    design: { ...design, product: { ...design.product, prgPackagingLog: task } } })
  expect(wrapper.get('.build-task-row .package-timing').text()).toContain('card.buildElapsed')
  expect(wrapper.get('.build-task-row .package-timing').text()).toContain('card.buildRemaining')
  await wrapper.setProps({ nowMs: 1100000 })
  expect(wrapper.get('.build-task-row .package-timing').text()).toContain('card.buildOverEstimate')
  await wrapper.setProps({ design: { ...design, product: { ...design.product,
    prgPackagingLog: { ...task, packagingStatus: 'complete' } } } as any })
  expect(wrapper.find('.build-task-row .package-timing').exists()).toBe(false)
  wrapper.unmount()
})
