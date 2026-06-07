<template>
  <el-card class="section-card" shadow="never" v-loading="loading">
    <template #header>
      <div class="card-header">
        <span>App Info</span>
        <el-button
          v-if="product?.garminStoreUrl"
          type="primary"
          link
          @click="openStoreUrl(product.garminStoreUrl)"
        >
          Open Garmin Store
        </el-button>
      </div>
    </template>

    <el-empty v-if="!product" description="No app info" />

    <template v-else>
      <div class="product-overview">
        <div class="product-cover">
          <el-image
            v-if="imageUrl"
            :src="imageUrl"
            fit="cover"
            class="product-cover__image"
            preview-teleported
          />
          <div v-else class="product-cover__placeholder">No image</div>
          <div class="product-name">{{ product.name || '-' }}</div>
        </div>

        <div class="product-main">
          <div class="product-summary">
            <div class="summary-item">
              <div class="summary-label">Downloads</div>
              <div class="summary-value">{{ formatCountDisplay(product.download) }}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Orders</div>
              <div class="summary-value">{{ formatCountDisplay(product.purchase) }}</div>
            </div>
          </div>

          <el-descriptions :column="2" border class="stats-detail">
            <el-descriptions-item label="App ID">{{ product.appId ?? '-' }}</el-descriptions-item>
            <el-descriptions-item label="Price">{{ formatPriceDisplay((product as any).price) }}</el-descriptions-item>
            <el-descriptions-item label="Trial">{{ formatTrialDisplay((product as any).trialLasts) }}</el-descriptions-item>
            <el-descriptions-item label="Design ID">
              <span class="mono">{{ (product as any).designId || '-' }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="Garmin UUID">
              <span class="mono">{{ (product as any).garminAppUuid || '-' }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="Last Go Live">{{ formatDateDisplay((product as any).lastGoLive) }}</el-descriptions-item>
          </el-descriptions>
        </div>
      </div>
    </template>
  </el-card>
</template>

<script setup lang="ts">
import { formatDateTime } from '@/utils/date'
import type { Product } from '@/types/api/product'

defineProps<{
  loading: boolean
  product: Product | null
  imageUrl: string
}>()

const openStoreUrl = (url: string) => {
  window.open(url, '_blank', 'noopener,noreferrer')
}

const formatDateDisplay = (v?: any) => {
  if (!v) return '-'
  return formatDateTime(v)
}

const formatPriceDisplay = (v?: number | null) => {
  const n = Number(v ?? 0)
  if (!Number.isFinite(n)) return '-'
  return `$${n.toFixed(2)}`
}

const formatTrialDisplay = (v?: number | null) => {
  const n = Number(v ?? 0)
  if (!Number.isFinite(n) || n <= 0) return 'No trial'
  if (Number.isInteger(n)) return `${n} h`
  return `${n.toFixed(2)} h`
}

const formatCountDisplay = (v?: number | null) => {
  const n = Number(v ?? 0)
  if (!Number.isFinite(n)) return '-'
  return n.toLocaleString()
}
</script>

<style scoped>
.section-card { margin-bottom: 24px; }
.card-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
.stats-detail { margin-top: 8px; }
.product-overview { display: flex; gap: 20px; align-items: flex-start; flex-wrap: wrap; }
.product-cover { width: 180px; flex: 0 0 180px; }
.product-cover__image,
.product-cover__placeholder {
  width: 180px;
  height: 180px;
  border-radius: 16px;
  overflow: hidden;
  background: var(--el-fill-color-light);
}
.product-cover__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--studio-text-subtle);
  font-size: 14px;
}
.product-main { flex: 1; min-width: 320px; }
.product-summary { display: grid; grid-template-columns: repeat(2, minmax(140px, 180px)); gap: 12px; margin-bottom: 16px; }
.summary-item {
  border: 1px solid var(--el-border-color-light);
  border-radius: 14px;
  background: var(--el-fill-color-blank);
  padding: 14px 16px;
}
.summary-label { font-size: 12px; color: var(--el-text-color-secondary); margin-bottom: 6px; }
.summary-value { font-size: 24px; line-height: 1.1; font-weight: 700; color: var(--el-text-color-primary); }
.product-name { font-size: 20px; font-weight: 700; color: var(--studio-text); line-height: 1.3; margin-top: 10px; }
</style>
