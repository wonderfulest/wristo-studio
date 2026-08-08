import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { shouldShowBuildIqButton, shouldShowPreviewPrgButton } from './designCardActions'

const source = readFileSync(new URL('./DesignCard.vue', import.meta.url), 'utf8')
const workspaceSource = readFileSync(new URL('./MyDesigns.vue', import.meta.url), 'utf8')
const newProjectsSource = readFileSync(new URL('./RecentProjectsSection.vue', import.meta.url), 'utf8')

describe('DesignCard Build IQ action', () => {
  it.each([
    ['without a packaging log', {}, true],
    ['after packaging leaves the queue', { packagingLog: { rank: null } }, true],
    ['while packaging', { packagingLog: { rank: 0 } }, false],
    ['while queued', { packagingLog: { rank: 2 } }, false],
  ] as const)('%s', (_label, product, expected) => {
    expect(shouldShowBuildIqButton(product)).toBe(expected)
  })

  it('does not render the action without a product', () => {
    expect(shouldShowBuildIqButton(undefined)).toBe(false)
  })

  it('uses the packaging-only visibility rule in the card', () => {
    expect(source).toContain('shouldShowBuildIqButton(design.value.product)')
    expect(source).not.toContain(':disabled="!!design.product?.packagingLog?.rank"')
  })

  it('keeps package download visible in Workspace only', () => {
    expect(workspaceSource).toContain(':show-package-download="true"')
    expect(newProjectsSource).toContain(':show-package-download="false"')
  })
})

describe('DesignCard Preview in Simulator action', () => {
  it('is visible only for a completed downloadable PRG release', () => {
    expect(shouldShowPreviewPrgButton({ prgRelease: { id: 9, prgUrl: 'https://cdn.wristo.io/watch.prg' } })).toBe(true)
    expect(shouldShowPreviewPrgButton({ prgRelease: { id: 9, prgUrl: '' } })).toBe(false)
    expect(shouldShowPreviewPrgButton({})).toBe(false)
    expect(shouldShowPreviewPrgButton(undefined)).toBe(false)
  })

  it('wires the card action to the workspace launcher flow', () => {
    expect(source).toContain('shouldShowPreviewPrgButton(design.value.product)')
    expect(source).toContain("emit('preview-prg', design)")
    expect(workspaceSource).toContain('@preview-prg="previewPrg"')
  })

  it('allows simulator preview without granting PRG download permission', () => {
    const previewHandler = workspaceSource.slice(
      workspaceSource.indexOf('const previewPrg ='),
      workspaceSource.indexOf('// 检查是否有可下载的安装包'),
    )
    const downloadHandler = workspaceSource.slice(
      workspaceSource.indexOf('const runPrg ='),
      workspaceSource.indexOf('const launcherTicketCache'),
    )

    expect(previewHandler).not.toContain('membershipGate.requireExport()')
    expect(downloadHandler).toContain('membershipGate.requireExport()')
  })

  it('downloads the PRG before opening a valid simulator preview', () => {
    const previewHandler = workspaceSource.slice(
      workspaceSource.indexOf('const previewPrg ='),
      workspaceSource.indexOf('// 检查是否有可下载的安装包'),
    )
    const ticketIndex = previewHandler.indexOf('if (!ticket)')
    const downloadIndex = previewHandler.indexOf('downloadPackageFile(')
    const launcherIndex = previewHandler.indexOf('window.location.href = buildLauncherDeepLink(ticket)')

    expect(ticketIndex).toBeGreaterThanOrEqual(0)
    expect(downloadIndex).toBeGreaterThan(ticketIndex)
    expect(launcherIndex).toBeGreaterThan(downloadIndex)
  })
})

describe('DesignCard responsive actions panel', () => {
  it('keeps the primary edit action and groups all secondary actions in an overlay', () => {
    expect(source).toContain('class="actions-toggle"')
    expect(source).toContain(':aria-expanded="actionsExpanded"')
    expect(source).toContain('<el-popover')
    expect(source).toContain('v-model:visible="actionsExpanded"')
    expect(source).toContain(':teleported="true"')
    expect(source).toContain('<template #reference>')
    expect(source).toContain('const closeActions = () =>')
    expect(source).toContain('class="actions-panel"')
    expect(source).toContain('class="action-group action-group-preview"')
    expect(source).toContain('class="action-group action-group-build"')
    expect(source).toContain('class="action-group action-group-release"')
    expect(source).toContain('class="action-group action-group-manage"')
    expect(source).not.toContain('<transition name="actions-panel">')
  })

  it('uses a content-driven grid and preserves existing action events', () => {
    expect(source).toContain('repeat(auto-fit, minmax(min(100%, 132px), 1fr))')
    expect(source).toContain('flex-wrap: nowrap')
    expect(source).toContain('flex: 1 1 0')
    expect(source).toContain("emit('copy', design)")
    expect(source).toContain("emit('edit', design)")
    expect(source).toContain("emit('transfer-owner', design)")
    expect(source).toContain("emit('delete', design)")
    expect(source).toContain("emit('build-prg', design)")
    expect(source).toContain("emit('preview-prg', design)")
    expect(source).toContain("emit('submit', design)")
    expect(source).toContain("emit('go-live', design)")
  })
})
