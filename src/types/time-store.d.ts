declare module '@/stores/elements/time/timeElement' {
  import type { Store } from 'pinia'

  export interface TimeStoreState {
    timeElements: any[]
    updateInterval: any
  }

  export interface TimeStoreActions {
    formatTime: (date: Date, formatter: number | string) => string
    addElement: (options?: Record<string, any>) => Promise<any>
    updateByTime: (date: Date) => void
    updateElement: (element: any, config: Record<string, any>) => void
    encodeConfig: (element: any) => Record<string, any>
    decodeConfig: (config: Record<string, any>) => Record<string, any>
  }

  export type TimeStore = Store<'timeStore', TimeStoreState, any, TimeStoreActions>

  export function useTimeStore(): TimeStore
}
