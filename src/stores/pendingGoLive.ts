import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { productsApi } from '@/api/wristo/products'
import type { Product } from '@/types/api/product'
import type { ApiResponse } from '@/types/api/api'

export const usePendingGoLiveStore = defineStore('pendingGoLive', () => {
  const items = ref<Product[]>([])
  const loading = ref<boolean>(false)

  const count = computed<number>(() => items.value.length)

  async function fetch(): Promise<void> {
    loading.value = true
    try {
      const res: ApiResponse<Product[]> = await productsApi.getGoLivePendingList()
      items.value = Array.isArray(res.data) ? res.data : []
    } catch {
      items.value = []
    } finally {
      loading.value = false
    }
  }

  function setItems(list: Product[]): void {
    items.value = list
  }

  return { items, loading, count, fetch, setItems }
})
