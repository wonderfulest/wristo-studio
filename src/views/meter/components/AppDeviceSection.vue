<template>
  <div>
    <el-card class="section-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>Devices</span>
          <el-button type="primary" link :loading="overviewLoading" @click="emit('refresh-overview')">Refresh</el-button>
        </div>
      </template>

      <div v-if="overviewLoading && !overview" v-loading="true" style="height: 80px" />

      <template v-else-if="overview">
        <el-row :gutter="16" class="overview-cards">
          <el-col :span="6">
            <el-statistic
              title="Active"
              :value="overview.active"
              class="clickable-stat"
              @click="emit('show-list', 'active')"
            >
              <template #suffix><span class="suffix-text">devices</span></template>
            </el-statistic>
          </el-col>
          <el-col :span="6">
            <el-statistic
              title="Lost"
              :value="overview.lost"
              class="clickable-stat"
              @click="emit('show-list', 'lost')"
            >
              <template #suffix><span class="suffix-text">devices</span></template>
            </el-statistic>
          </el-col>
          <el-col :span="6">
            <el-statistic
              title="Total"
              :value="overview.total"
              class="clickable-stat"
              @click="emit('show-list', 'all')"
            >
              <template #suffix><span class="suffix-text">devices</span></template>
            </el-statistic>
          </el-col>
          <el-col :span="6">
            <el-statistic title="Avg Lifecycle" :value="Number((overview.avgLifecycleMinutes ?? 0).toFixed(2))">
              <template #suffix><span class="suffix-text">min</span></template>
            </el-statistic>
          </el-col>
        </el-row>
      </template>

      <el-empty v-else description="No device data" />
    </el-card>

    <el-card v-if="deviceList === 'active'" class="section-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>Active Devices (last 30 minutes)</span>
          <el-button type="primary" link :loading="activeLoading" @click="emit('refresh-list', 'active')">Refresh</el-button>
        </div>
      </template>
      <el-table :data="activeDevices" v-loading="activeLoading" style="width: 100%" max-height="400">
        <el-table-column type="index" label="#" width="60" />
        <el-table-column prop="token" label="Device Token" min-width="300">
          <template #default="{ row }">
            <span class="mono">{{ row.token }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="lastOnlineTime" label="Last Online" min-width="220">
          <template #default="{ row }">
            <div class="time-cell">
              <div>{{ formatTs(row.lastOnlineTime) }}</div>
              <div class="time-cell__relative">{{ formatRelativeTime(row.lastOnlineTime) }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="Action" width="120">
          <template #default="{ row }">
            <el-button type="primary" link @click="emit('open-detail', row.token)">Detail</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card v-if="deviceList === 'lost'" class="section-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>Lost Devices</span>
          <el-button type="primary" link :loading="lostLoading" @click="emit('refresh-list', 'lost')">Refresh</el-button>
        </div>
      </template>
      <el-table :data="lostDevices" v-loading="lostLoading" style="width: 100%" max-height="400">
        <el-table-column type="index" label="#" width="60" />
        <el-table-column prop="token" label="Device Token" min-width="300">
          <template #default="{ row }">
            <span class="mono">{{ row.token }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="lastOnlineTime" label="Last Online" min-width="220">
          <template #default="{ row }">
            <div class="time-cell">
              <div>{{ formatTs(row.lastOnlineTime) }}</div>
              <div class="time-cell__relative">{{ formatRelativeTime(row.lastOnlineTime) }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="Action" width="120">
          <template #default="{ row }">
            <el-button type="primary" link @click="emit('open-detail', row.token)">Detail</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card v-if="deviceList === 'all'" class="section-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>All Devices</span>
          <el-button type="primary" link :loading="allLoading" @click="emit('refresh-list', 'all')">Refresh</el-button>
        </div>
      </template>
      <el-table :data="allDevices" v-loading="allLoading" style="width: 100%" max-height="400">
        <el-table-column type="index" label="#" width="60" />
        <el-table-column prop="token" label="Device Token" min-width="300">
          <template #default="{ row }">
            <span class="mono">{{ row.token }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="lastOnlineTime" label="Last Online" min-width="220">
          <template #default="{ row }">
            <div class="time-cell">
              <div>{{ formatTs(row.lastOnlineTime) }}</div>
              <div class="time-cell__relative">{{ formatRelativeTime(row.lastOnlineTime) }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="Action" width="120">
          <template #default="{ row }">
            <el-button type="primary" link @click="emit('open-detail', row.token)">Detail</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-drawer
      :model-value="detailVisible"
      title="Device Detail"
      size="420px"
      @update:modelValue="emit('update:detailVisible', $event)"
    >
      <div v-if="detail" class="detail-content">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="App ID">{{ detail.appId }}</el-descriptions-item>
          <el-descriptions-item label="Token">
            <span class="mono">{{ detail.token }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="First Seen">{{ formatTs(detail.firstTime) }}</el-descriptions-item>
          <el-descriptions-item label="Last Seen">{{ formatTs(detail.lastTime) }}</el-descriptions-item>
          <el-descriptions-item label="Lifecycle">{{ (detail.lifecycleMinutes ?? 0).toFixed(2) }} min</el-descriptions-item>
        </el-descriptions>
      </div>
      <div v-else-if="detailLoading" v-loading="true" style="height: 200px" />
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { formatDateTime } from '@/utils/date'
import type { DeviceActiveVO, DeviceDetailVO, DeviceOverviewVO } from '@/types/meter'

defineProps<{
  overviewLoading: boolean
  overview: DeviceOverviewVO | null

  deviceList: 'active' | 'lost' | 'all' | null

  activeLoading: boolean
  activeDevices: DeviceActiveVO[]

  lostLoading: boolean
  lostDevices: DeviceActiveVO[]

  allLoading: boolean
  allDevices: DeviceActiveVO[]

  detailVisible: boolean
  detailLoading: boolean
  detail: DeviceDetailVO | null
}>()

const emit = defineEmits<{
  (e: 'refresh-overview'): void
  (e: 'show-list', v: 'active' | 'lost' | 'all'): void
  (e: 'refresh-list', v: 'active' | 'lost' | 'all'): void
  (e: 'open-detail', token: string): void
  (e: 'update:detailVisible', v: boolean): void
}>()

const formatTs = (ts: number) => {
  if (!ts) return '-'
  return formatDateTime(new Date(ts))
}

const formatRelativeTime = (ts: number) => {
  if (!ts) return '-'
  const diff = Date.now() - ts
  if (diff < 0) return 'Just now'
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  if (diff < minute) return 'Just now'
  if (diff < hour) return `${Math.floor(diff / minute)} minutes ago`
  if (diff < day) return `${Math.floor(diff / hour)} hours ago`
  return `${Math.floor(diff / day)} days ago`
}
</script>

<style scoped>
.section-card { margin-bottom: 24px; }
.card-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.overview-cards { margin-bottom: 8px; }
.overview-cards .el-statistic { background: var(--el-bg-color-page); border-radius: 12px; padding: 20px; }
.clickable-stat { cursor: pointer; transition: box-shadow 0.2s; }
.clickable-stat:hover { box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12); }
.suffix-text { font-size: 12px; color: var(--studio-text-muted); }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
.time-cell { line-height: 1.4; }
.time-cell__relative { font-size: 12px; color: var(--studio-text-subtle); }
.detail-content { padding: 8px; }
</style>
