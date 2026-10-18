interface PackagingDevice {
  deviceId: string
  memoryBytes: number | null
  supportsExtendedCode?: boolean | null
}

// Keep unknown capabilities visible ahead of devices confirmed to support extended code.
const capabilityRank = (value: boolean | null | undefined) => value === false ? 0 : value == null ? 1 : 2

export function comparePackagingDevices(a: PackagingDevice, b: PackagingDevice): number {
  return capabilityRank(a.supportsExtendedCode) - capabilityRank(b.supportsExtendedCode)
    || (b.memoryBytes ?? -1) - (a.memoryBytes ?? -1)
    || a.deviceId.localeCompare(b.deviceId)
}
