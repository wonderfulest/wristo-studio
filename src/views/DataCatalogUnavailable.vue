<template>
  <section class="data-catalog-unavailable" role="alert" aria-live="assertive">
    <h1>Editor unavailable</h1>
    <p>The data catalog could not be loaded, so the editor has not opened.</p>
    <p v-if="catalog.error" class="error-detail">{{ catalog.error }}</p>
    <el-button type="primary" :loading="retrying" @click="retry">Retry</el-button>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDataCatalogStore } from '@/stores/dataCatalogStore'

const route = useRoute()
const router = useRouter()
const catalog = useDataCatalogStore()
const retrying = ref(false)

const returnTo = computed(() => {
  const value = route.query.returnTo
  return typeof value === 'string' && /^\/(?!\/)/.test(value) ? value : '/designs/new-projects'
})

const retry = async () => {
  retrying.value = true
  try {
    await catalog.load(true)
    await router.replace(returnTo.value)
  } catch {
    // The catalog store retains the latest safe error for this page to display.
  } finally {
    retrying.value = false
  }
}
</script>

<style scoped>
.data-catalog-unavailable {
  width: min(100% - 32px, 560px);
  margin: 96px auto;
  padding: 32px;
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  background: var(--el-bg-color);
}

.data-catalog-unavailable h1 {
  margin-top: 0;
}

.error-detail {
  color: var(--el-color-danger);
  overflow-wrap: anywhere;
}
</style>
