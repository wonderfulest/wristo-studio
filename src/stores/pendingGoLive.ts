import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { productsApi } from '@/api/wristo/products'
import type { Product } from '@/types/api/product'
import type { ApiResponse } from '@/types/api/api'

export const usePendingGoLiveStore = defineStore('pendingGoLive', () => {
  const items = ref<Product[]>([])
  const loading = ref<boolean>(false)

  const count = computed<number>(() => items.value.length)

  let requestVersion = 0

  async function fetch(): Promise<void> {
    const version = ++requestVersion
    loading.value = true
    try {
      const res: ApiResponse<Product[]> = await productsApi.getGoLivePendingList()
      if (version === requestVersion) items.value = Array.isArray(res.data) ? res.data : []
    } catch {
      if (version === requestVersion) items.value = []
    } finally {
      if (version === requestVersion) loading.value = false
    }
  }

  function setItems(list: Product[]): void {
    requestVersion++
    loading.value = false
    items.value = list
  }

  return { items, loading, count, fetch, setItems }
})
