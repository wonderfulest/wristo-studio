import { defineStore } from 'pinia'
import type { PreviewDeviceContext } from '@/utils/unitResolver'

export const usePreviewDeviceContextStore = defineStore('previewDeviceContext', {
  state: () => ({
    distanceUnits: 'metric' as 'metric' | 'statute',
    temperatureUnits: 'metric' as 'metric' | 'statute',
  }),
  actions: {
    setDistanceUnits(value: 'metric' | 'statute') {
      this.distanceUnits = value
    },
    setTemperatureUnits(value: 'metric' | 'statute') {
      this.temperatureUnits = value
    },
    toContext(language: 'eng' | 'zhs'): PreviewDeviceContext {
      return {
        language,
        distanceUnits: this.distanceUnits,
        temperatureUnits: this.temperatureUnits,
      }
    },
  },
})
