<template>
  <el-card class="section-card" shadow="never" v-loading="loading">
    <template #header>
      <div class="card-header">
        <span>{{ t('meter.today') }}</span>
        <span class="header-meta">
          <span v-if="selectedAppName" class="app-name">{{ selectedAppName }}</span>
          <span class="meta-split">·</span>
          <span>{{ t('card.appId') }}: {{ appId }}</span>
          <span class="meta-split">·</span>
          <span>{{ t('meter.date') }}: {{ displayDate }}</span>
        </span>
      </div>
    </template>

    <el-empty v-if="!meter" :description="t('common.noData')" />

    <template v-else>
      <el-row :gutter="16" class="stats-cards">
        <el-col :span="4"><el-statistic title="DAU" :value="meter.dau ?? 0" /></el-col>
        <el-col :span="4"><el-statistic title="MAU" :value="meter.mau ?? 0" /></el-col>
        <el-col :span="4"><el-statistic :title="t('meter.newUsers')" :value="meter.newUsers ?? 0" /></el-col>
        <el-col :span="4"><el-statistic :title="t('meter.activeUsers')" :value="meter.activeUsers ?? 0" /></el-col>
        <el-col :span="4"><el-statistic :title="t('meter.orders')" :value="meter.orders ?? 0" /></el-col>
        <el-col :span="4"><el-statistic :title="t('meter.revenue')" :value="formatMoney(meter.revenue)" /></el-col>
      </el-row>

      <el-descriptions :column="2" border class="stats-detail">
        <el-descriptions-item :label="t('meter.totalUsers')">{{ meter.totalUsers ?? 0 }}</el-descriptions-item>
        <el-descriptions-item :label="t('meter.sessions')">{{ meter.sessions ?? 0 }}</el-descriptions-item>

        <el-descriptions-item label="DAU/MAU">{{ formatRatio(meter.dauMau) }}</el-descriptions-item>
        <el-descriptions-item :label="t('meter.conversion')">{{ formatPercent(meter.conversionRate) }}</el-descriptions-item>

        <el-descriptions-item :label="t('meter.d1Retention')">{{ formatPercent(meter.d1Retention) }}</el-descriptions-item>
        <el-descriptions-item :label="t('meter.d7Retention')">{{ formatPercent(meter.d7Retention) }}</el-descriptions-item>

        <el-descriptions-item :label="t('meter.usage')">{{ formatMinutes(meter.usageMinutes) }}</el-descriptions-item>
        <el-descriptions-item :label="t('meter.avgUsage')">{{ formatMinutes(meter.avgUsageMinutes) }}</el-descriptions-item>

        <el-descriptions-item label="ARPU">{{ formatMoney(meter.arpu) }}</el-descriptions-item>
      </el-descriptions>
    </template>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AppMeterVO } from '@/types/meter'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const props = defineProps<{
  loading: boolean
  meter: AppMeterVO | null
  appId: number
  date: string
  selectedAppName: string
}>()

const displayDate = computed(() => props.meter?.date || props.date || '-')

const formatPercent = (v?: number | null) => {
  const n = Number(v ?? 0)
  if (!Number.isFinite(n)) return '0%'
  return `${(n * 100).toFixed(2)}%`
}

const formatRatio = (v?: number | null) => {
  const n = Number(v ?? 0)
  if (!Number.isFinite(n)) return '0'
  return n.toFixed(4)
}

const formatMoney = (v?: number | null) => {
  const n = Number(v ?? 0)
  if (!Number.isFinite(n)) return 0
  return Number(n.toFixed(2))
}

const formatMinutes = (v?: number | null) => {
  const n = Number(v ?? 0)
  if (!Number.isFinite(n)) return '-'
  return `${n.toFixed(2)} ${t('meter.minuteUnit')}`
}
</script>

<style scoped>
.section-card { margin-bottom: 24px; }
.card-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.header-meta { color: var(--studio-text-subtle); font-size: 12px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.app-name { color: var(--studio-text-muted); font-weight: 600; }
.meta-split { opacity: 0.7; }
.stats-cards { margin-bottom: 20px; }
.stats-cards .el-statistic { background: var(--el-bg-color-page); border-radius: 12px; padding: 16px; }
.stats-detail { margin-top: 8px; }
</style>
