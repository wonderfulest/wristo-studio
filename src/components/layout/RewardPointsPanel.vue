<template>
  <section class="reward-points">
    <h3>{{ t('credits.rewardBalance', {count: balance ?? '—'}) }}</h3>
    <p>{{ t('credits.rewardPolicy') }}</p>
    <el-button :loading="loading" @click="load">{{ t('credits.retry') }}</el-button>
    <p v-if="error" role="alert">{{ t('credits.loadFailed') }}</p>
    <el-table :data="entries" v-loading="loading" max-height="260">
      <el-table-column :label="t('credits.time')" min-width="170"><template #default="{row}">{{ new Date(row.createdAt).toLocaleString() }}</template></el-table-column>
      <el-table-column prop="description" :label="t('credits.type')" min-width="170" />
      <el-table-column prop="delta" :label="t('credits.change')" width="100" />
    </el-table>
    <el-pagination v-model:current-page="page" :total="total" :page-size="20" layout="prev, pager, next" @current-change="load" />
  </section>
</template>
<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import instance from '@/config/axios'
import type { ApiResponse } from '@/types/api/api'
import { useI18n } from '@/i18n'
const props = defineProps<{ active: boolean }>()
const { t } = useI18n()
const balance = ref<number | null>(null), page = ref(1), total = ref(0), loading = ref(false), error = ref(false)
const entries = ref<{id: string; description: string; delta: number; createdAt: string}[]>([])
let sequence = 0
async function load() {
  if (!props.active) return
  const ticket = ++sequence
  loading.value = true; error.value = false
  try {
    const [a,h]: [ApiResponse<{balance: number}>, ApiResponse<{items: typeof entries.value; total: number}>] = await Promise.all([
      instance.get<unknown, ApiResponse<{balance: number}>>('/user/reward-points'), instance.get<unknown, ApiResponse<{items: typeof entries.value; total: number}>>('/user/reward-points/history', {params: {page: page.value, pageSize: 20}})
    ])
    if (ticket !== sequence) return
    if (!a.data || !h.data) throw new Error('Missing reward account')
    balance.value = a.data.balance; entries.value = h.data.items; total.value = h.data.total
  } catch { if (ticket === sequence) { error.value = true; balance.value = null; entries.value = []; total.value = 0 } }
  finally { if (ticket === sequence) loading.value = false }
}
watch(() => props.active, active => { sequence++; balance.value = null; entries.value = []; total.value = 0; page.value = 1; if (active) void load() }, { immediate: true })
onMounted(() => window.addEventListener('studio-credits-changed', load))
onUnmounted(() => { sequence++; window.removeEventListener('studio-credits-changed', load) })
</script>
<style scoped>.reward-points { border-top: 1px solid var(--studio-border); margin-top: 16px; padding-top: 12px; } p { color: var(--studio-text-muted); }</style>
