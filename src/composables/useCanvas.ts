import { useBaseStore } from '@/stores/baseStore'

export interface UseCanvasApi {
  /**
   * Wait until the Fabric canvas in baseStore is initialized.
   * Rejects on timeout.
   * @param timeout milliseconds, default 10000
   */
  waitCanvasReady: (timeout?: number) => Promise<void>
}

export function useCanvas(): UseCanvasApi {
  const baseStore = useBaseStore()

  const waitCanvasReady = (timeout: number = 10000): Promise<void> => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now()

      const checkCanvas = () => {
        // timeout guard
        if (Date.now() - startTime > timeout) {
          reject(new Error('Canvas initialization timeout'))
          return
        }

        if (baseStore.canvas) {
          resolve()
        } else {
          setTimeout(checkCanvas, 100)
        }
      }

      checkCanvas()
    })
  }

  return {
    waitCanvasReady,
  }
}
