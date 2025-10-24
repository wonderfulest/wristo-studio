<template>
  <div class="page">
    <div class="header">
      <div class="filters">
        <el-input
          v-model="displayName"
          placeholder="Device name (fuzzy search)"
          clearable
          style="width: 240px"
          @input="onNameInput"
        />
        <el-select v-model="orderBy" placeholder="Sort" clearable style="width: 180px" @change="onSortChange">
          <el-option label="Created desc" value="id:desc" />
          <el-option label="Created asc" value="id:asc" />
        </el-select>
        <el-button type="primary" @click="loadData">Search</el-button>
      </div>
    </div>

    <el-table :data="list" border v-loading="loading" style="width: 100%">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column label="Image" width="80" align="center">
        <template #default="{ row }">
          <el-image v-if="row.imageUrl" :src="row.imageUrl" style="width: 48px; height: 48px" fit="cover" />
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column prop="displayName" label="Device Name" min-width="180" />
      <el-table-column prop="deviceId" label="Device ID" min-width="140" />
      <el-table-column prop="partNumber" label="Part No." min-width="140" />
      <el-table-column prop="deviceFamily" label="Family" width="120" />
      <el-table-column prop="deviceGroup" label="API Group" width="120" />
      <el-table-column prop="resolutionWidth" label="Resolution" width="140">
        <template #default="{ row }">{{ row.resolutionWidth }} × {{ row.resolutionHeight }}</template>
      </el-table-column>
      <el-table-column prop="displayType" label="Display Type" width="140" />
      <el-table-column prop="enhancedGraphicSupport" label="Enhanced Graphic" width="150">
        <template #default="{ row }"><el-tag :type="row.enhancedGraphicSupport ? 'success' : 'info'">{{ row.enhancedGraphicSupport ? 'Yes' : 'No' }}</el-tag></template>
      </el-table-column>
      <el-table-column label="Device PNG" width="120">
        <template #default="{ row }">
          <el-image v-if="row.devicePng" :src="row.devicePng" style="width: 48px; height: 48px" fit="cover" />
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="Actions" width="160" align="center">
        <template #default="{ row }">
          <el-button type="primary" link :disabled="!row.devicePng" @click="downloadDevicePng(row)">
            Download PNG
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination">
      <el-pagination
        v-model:current-page="pageNum"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        @size-change="loadData"
        @current-change="loadData"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import type { GarminDeviceVO } from '@/types/api/garmin-device'
import garminDevicesApi from '@/api/wristo/garminDevices'

const list = ref<GarminDeviceVO[]>([])
const total = ref<number>(0)
const pageNum = ref<number>(1)
const pageSize = ref<number>(20)
const orderBy = ref<string | undefined>('id:desc')
const displayName = ref<string>('')
const loading = ref<boolean>(false)
let searchTimer: number | undefined

async function loadData(): Promise<void> {
  loading.value = true
  try {
    const resp = await garminDevicesApi.page({
      pageNum: pageNum.value,
      pageSize: pageSize.value,
      orderBy: orderBy.value,
      displayName: displayName.value || undefined,
    })
    const data = resp.data
    list.value = data?.list ?? []
    total.value = data?.total ?? 0
  } catch (e) {
    ElMessage.error('Failed to load devices')
  } finally {
    loading.value = false
  }
}

function onNameInput(): void {
  pageNum.value = 1
  if (searchTimer) window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => {
    loadData()
  }, 300)
}

function onSortChange(): void {
  pageNum.value = 1
  loadData()
}

onMounted(loadData)

async function downloadDevicePng(row: GarminDeviceVO): Promise<void> {
  try {
    if (!row.devicePng) return
    const a = document.createElement('a')
    a.href = row.devicePng
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    a.click()
  } catch (e) {
    ElMessage.error('Failed to open PNG')
  }
}
</script>

<style scoped>
.page { padding: 24px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.filters { display: flex; gap: 12px; align-items: center; }
.pagination { margin-top: 16px; text-align: right; }
</style>
