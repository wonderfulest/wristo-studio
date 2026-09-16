import { describe, expect, it } from 'vitest'
import { getPrgCardAction, shouldShowBuildIqButton, shouldShowBuildLog, shouldShowPreviewPrgButton, shouldShowPublishButton } from './designCardActions'
import type { DesignListItem } from '@/types/api/design'

const card: DesignListItem = {
  id: 1, designUid: 'face', name: 'Face', designStatus: 'approved', createdAt: 0, updatedAt: 1,
  user: { id: 7, username: 'designer' }, cover: { url: 'cover.png' },
  product: {
    id: 2, appId: 100, name: 'Face', payment: { paymentMethod: 'free' },
    release: { id: 3, packageUrl: 'face.iq', updatedAt: 1 },
    prgRelease: { id: 4, deviceId: 'fenix8', prgUrl: 'face.prg', updatedAt: 1, canRebuild: true },
    packagingLog: { id: 5, packagingStatus: 'completed', createdAt: 0, hasBuildLog: true },
  },
}

describe('lightweight design cards', () => {
  it('preserves build, publish, preview and log actions without editor data', () => {
    expect(shouldShowBuildIqButton(card.product)).toBe(true)
    expect(shouldShowPublishButton(card.product, false)).toBe(true)
    expect(shouldShowPreviewPrgButton(card.product, 'fenix8')).toBe(true)
    expect(shouldShowPreviewPrgButton(card.product, 'other')).toBe(false)
    expect(getPrgCardAction(card.product, card.updatedAt, 'fenix8')).toBe('build')
    expect(shouldShowBuildLog(card.product?.packagingLog)).toBe(true)
  })

  it('hides logs until finished and no longer owned by the queue', () => {
    const log = card.product!.packagingLog!
    expect(shouldShowBuildLog({ ...log, rank: 0 })).toBe(false)
    expect(shouldShowBuildLog({ ...log, packagingStatus: 'pending' })).toBe(false)
    expect(shouldShowBuildLog({ ...log, hasBuildLog: false })).toBe(false)
    expect(shouldShowBuildLog({ ...log, packagingStatus: 'failed' })).toBe(true)
  })

  it('still supports full detail cards in Recent Projects', () => {
    expect(shouldShowBuildLog({ id: 5, packagingStatus: 'complete', lastBuildLogPath: 'build.log' })).toBe(true)
  })
})
