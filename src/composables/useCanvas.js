import { useBaseStore } from '@/stores/baseStore'

export function useCanvas() {
  const baseStore = useBaseStore()

  /**
   * 等待画布初始化完成
   * @param {number} timeout - 超时时间(毫秒),默认 10 秒
   * @returns {Promise<void>}
   * @throws {Error} 如果超时会抛出错误
   */
  const waitCanvasReady = (timeout = 10000) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now()
      
      const checkCanvas = () => {
        // 检查是否超时
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
    waitCanvasReady
  }
} 