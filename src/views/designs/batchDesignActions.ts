import { getIqCancellationAction, getPrgCardAction, getPrgBuildDisabledReason } from './designCardActions'
import { designApi } from '@/api/wristo/design'
import { productsApi } from '@/api/wristo/products'
import { getDesignSharing, updateDesignSharing } from '@/api/wristo/designSharing'
import type { DesignListItem, DesignSubmitDTO } from '@/types/api/design'

export const batchActions = ['transfer', 'submit', 'prg', 'cancelIq', 'cancelPrg', 'public', 'remix', 'weight', 'delete'] as const
export type BatchAction = typeof batchActions[number]
export interface BatchOptions { target?: number; device: string; enabled: boolean; weight: number }
export interface PreparedAction { design: DesignListItem; reason?: string; run?: () => Promise<unknown> }
const active = (status?: string) => ['init', 'pending', 'processing', 'queued', 'running', 'cancel_requested'].includes(status || '')
const checked = async (promise: Promise<any>) => {
  const response = await promise
  if (response.code !== 0 || response.data === false) throw new Error(response.msg || 'Operation failed')
  return response.data
}
// Re-read each design before preparing an operation; never build submissions from list summaries.
export async function prepareBatchAction(item: DesignListItem, action: BatchAction, options: BatchOptions, t: (key: string) => string): Promise<PreparedAction> {
  const skip = (key: string): PreparedAction => ({ design: item, reason: t(key) })
  const d = await checked(designApi.getDesignByUid(item.designUid, options.device ? { device: options.device } : undefined))
  const product = d.product
  const appId = product?.appId
  let run: () => Promise<unknown>
  switch (action) {
    case 'transfer':
      if (!appId || !options.target) return skip('card.transferOwner.unavailable')
      if (d.user?.id === options.target) return skip('card.transferOwner.sameDesigner')
      run = () => checked(productsApi.transferOwner(appId, options.target!)); break
    case 'weight':
      if (!appId) return skip('batchActions.noApp')
      run = () => checked(productsApi.updateStoreWeight(appId, options.weight)); break
    case 'public': case 'remix': {
      const settings = await getDesignSharing(item.designUid)
      if (action === 'remix' && options.enabled && settings.copyEligible === false) return skip('designSharing.copyFreeOnly')
      const field = action === 'public' ? 'publiclyVisible' : 'allowRemix'
      if (settings[field] === options.enabled) return skip('batchActions.unchanged')
      run = () => updateDesignSharing(item.designUid, { [field]: options.enabled }); break
    }
    case 'delete':
      if (product?.lastGoLive || active(product?.packagingLog?.packagingStatus) || active(product?.prgPackagingLog?.packagingStatus)) return skip('batchActions.cannotDelete')
      run = () => checked(designApi.deleteDesign(item.designUid)); break
    case 'cancelIq': case 'cancelPrg': {
      const task = action === 'cancelIq' ? product?.packagingLog : product?.prgPackagingLog
      if (!task?.id || (action === 'cancelIq' ? getIqCancellationAction(product) : getPrgCardAction(product, d.updatedAt, options.device)) !== 'cancel') return skip('batchActions.noTask')
      if (action === 'cancelPrg' && !options.device) return skip('project.selectDeviceFirst')
      run = () => checked(action === 'cancelIq' ? designApi.cancelIqPackageTask(item.designUid, task.id) : designApi.cancelPrgPackageTask(item.designUid, options.device, task.id)); break
    }
    case 'prg':
      if (!options.device) return skip('project.selectDeviceFirst')
      if (active(product?.prgPackagingLog?.packagingStatus) || getPrgBuildDisabledReason(product, d.updatedAt, options.device)) return skip('batchActions.active')
      run = () => checked(designApi.submitPrgPackageTask(item.designUid, options.device)); break
    case 'submit': {
      if (active(product?.packagingLog?.packagingStatus)) return skip('batchActions.active')
      const devices = await checked(designApi.getPackagingDevices(item.designUid))
      if (!devices.selectedDeviceIds?.length) return skip('submitDesign.selectDeviceRequired')
      const payment = product?.payment
      // Trial duration belongs to the product, not its payment record.
      const trialLasts = product?.trialLasts
      if (!payment?.paymentMethod || !d.name?.trim()) return skip('batchActions.missingConfig')
      const method = payment.paymentMethod
      if (!['free', 'wpay', 'garmin', 'kpay'].includes(method)) return skip('batchActions.missingConfig')
      if (method !== 'free' && (!Number.isFinite(payment.price) || payment.price < 1.99 || payment.price > 5.99)) return skip('submitDesign.priceRange')
      if (method !== 'free' && (!Number.isFinite(trialLasts) || trialLasts < 0 || trialLasts > 720)) return skip('batchActions.missingConfig')
      if (method === 'kpay' && !payment.kpayId) return skip('submitDesign.kpayRequired')
      if (d.originalType === 'non_original' && (!d.sourcePlatform || !d.sourceId)) return skip('batchActions.missingConfig')
      if (d.sourcePlatform && d.sourceId && await checked(designApi.checkSourceDuplicate({ designUid: d.designUid, sourcePlatform: d.sourcePlatform, sourceId: d.sourceId }))) return skip('designSource.duplicate')
      const payload: DesignSubmitDTO = { designUid: d.designUid, expectedVersion: d.version, name: d.name, originalType: d.originalType || 'original', sourcePlatform: d.sourcePlatform || undefined, sourceId: d.sourceId || undefined, paymentMethod: method, targetDeviceIds: [...devices.selectedDeviceIds], ...(method !== 'free' ? { price: payment.price, trialLasts, kpayId: payment.kpayId } : {}) }
      run = () => checked(designApi.submitDesign(payload)); break
    }
  }
  return { design: item, run }
}
