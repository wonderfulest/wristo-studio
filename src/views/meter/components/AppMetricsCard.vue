<template>
  <el-card class="section-card" shadow="never" v-loading="loading">
    <template #header>
      <div class="card-header">
        <span>Today</span>
        <span class="header-meta">
          <span v-if="selectedAppName" class="app-name">{{ selectedAppName }}</span>
          <span class="meta-split">·</span>
          <span>App ID: {{ appId }}</span>
          <span class="meta-split">·</span>
          <span>Date: {{ displayDate }}</span>
        </span>
      </div>
    </template>

    <el-empty v-if="!meter" description="No data" />

    <template v-else>
      <el-row :gutter="16" class="stats-cards">
        <el-col :span="4"><el-statistic title="DAU" :value="meter.dau ?? 0" /></el-col>
        <el-col :span="4"><el-statistic title="MAU" :value="meter.mau ?? 0" /></el-col>
        <el-col :span="4"><el-statistic title="New Users" :value="meter.newUsers ?? 0" /></el-col>
        <el-col :span="4"><el-statistic title="Active Users" :value="meter.activeUsers ?? 0" /></el-col>
        <el-col :span="4"><el-statistic title="Orders" :value="meter.orders ?? 0" /></el-col>
        <el-col :span="4"><el-statistic title="Revenue" :value="formatMoney(meter.revenue)" /></el-col>
      </el-row>

      <el-descriptions :column="2" border class="stats-detail">
        <el-descriptions-item label="Total Users">{{ meter.totalUsers ?? 0 }}</el-descriptions-item>
        <el-descriptions-item label="Sessions">{{ meter.sessions ?? 0 }}</el-descriptions-item>

        <el-descriptions-item label="DAU/MAU">{{ formatRatio(meter.dauMau) }}</el-descriptions-item>
        <el-descriptions-item label="Conversion">{{ formatPercent(meter.conversionRate) }}</el-descriptions-item>

        <el-descriptions-item label="D1 Retention">{{ formatPercent(meter.d1Retention) }}</el-descriptions-item>
        <el-descriptions-item label="D7 Retention">{{ formatPercent(meter.d7Retention) }}</el-descriptions-item>

        <el-descriptions-item label="Usage">{{ formatMinutes(meter.usageMinutes) }}</el-descriptions-item>
        <el-descriptions-item label="Avg Usage">{{ formatMinutes(meter.avgUsageMinutes) }}</el-descriptions-item>

        <el-descriptions-item label="ARPU">{{ formatMoney(meter.arpu) }}</el-descriptions-item>
      </el-descriptions>
    </template>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AppMeterVO } from '@/types/meter'

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
  return `${n.toFixed(2)} min`
}
</script>

<style scoped>
.section-card { margin-bottom: 24px; }
.card-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.header-meta { color: #909399; font-size: 12px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.app-name { color: #606266; font-weight: 600; }
.meta-split { opacity: 0.7; }
.stats-cards { margin-bottom: 20px; }
.stats-cards .el-statistic { background: var(--el-bg-color-page); border-radius: 12px; padding: 16px; }
.stats-detail { margin-top: 8px; }
</style>
