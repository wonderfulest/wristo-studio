import type { Design } from '@/types/api/design'

export interface BatchSubmitConfig {
  paymentMethod?: string
  price?: number
  trialLasts?: number
  targetDeviceIds?: string[]
}
export interface BatchSubmitSnapshot {
  design: Design
  devices: { devices: { deviceId: string; displayName: string }[]; selectedDeviceIds: string[] }
}
export const submitFields = ['paymentMethod', 'price', 'trialLasts', 'targetDeviceIds'] as const
export type SubmitField = typeof submitFields[number]

// Display common values, but only explicitly edited fields become submission overrides.
export function summarizeSubmitConfig(snapshots: BatchSubmitSnapshot[]) {
  const configs = snapshots.map(({ design, devices }) => ({
    paymentMethod: design.product?.payment?.paymentMethod,
    price: design.product?.payment?.price,
    trialLasts: design.product?.trialLasts,
    targetDeviceIds: [...devices.selectedDeviceIds].sort(),
  }))
  const values: BatchSubmitConfig = {}
  const mixed: Partial<Record<SubmitField, boolean>> = {}
  for (const field of submitFields) {
    const first = configs[0]?.[field]
    mixed[field] = configs.some(config => JSON.stringify(config[field]) !== JSON.stringify(first))
    if (!mixed[field] && first != null) Object.assign(values, { [field]: first })
  }
  const devices = (snapshots[0]?.devices.devices || []).filter(device =>
    snapshots.every(snapshot => snapshot.devices.devices.some(candidate => candidate.deviceId === device.deviceId)))
  return { values, mixed, devices }
}
