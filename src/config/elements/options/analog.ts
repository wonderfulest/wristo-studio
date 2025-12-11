import type { HandOption } from '@/types/settings'
import type { AnalogAssetType } from '@/types/api/analog-asset'
import { useAnalogAssetStore } from '@/stores/analogAssetStore'
// === 通过 analogAssetApi.page + store 获取的动态选项（无本地兜底） ===

const getDynamicOptions = (type: AnalogAssetType): HandOption[] => {
  const store = useAnalogAssetStore()
  return store.getOptions(type)
}

export const getHourHandOptions = (): HandOption[] => {
  return getDynamicOptions('hour')
}

export const getMinuteHandOptions = (): HandOption[] => {
  return getDynamicOptions('minute')
}

export const getSecondHandOptions = (): HandOption[] => {
  return getDynamicOptions('second')
}

export const getTicks12Options = (): HandOption[] => {
  return getDynamicOptions('tick12')
}

export const getTicks60Options = (): HandOption[] => {
  return getDynamicOptions('tick60')
}

export const getRomansOptions = (): HandOption[] => {
  return getDynamicOptions('romans')
}
