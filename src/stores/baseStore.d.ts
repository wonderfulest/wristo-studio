declare module '@/stores/baseStore' {
  import { ref, Ref } from 'vue'
  
  export interface BaseStore {
    watchFaceName: Ref<string>
    elements: Ref<any[]>
    generateConfig(): any
  }
  
  export function useBaseStore(): BaseStore
} 