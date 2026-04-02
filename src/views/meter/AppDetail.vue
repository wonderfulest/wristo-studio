<template>
  <div class="meter-app-detail-page">
    <div class="header">
      <h2>App Operations</h2>
      <div class="filters">
        <el-date-picker
          v-model="date"
          type="date"
          placeholder="Select date (optional)"
          format="YYYYMMDD"
          value-format="YYYYMMDD"
          style="width: 180px"
          clearable
        />
        <el-button type="primary" :loading="loading" :disabled="!currentAppId" @click="fetchAll">Refresh</el-button>
      </div>
    </div>

    <el-empty v-if="!currentAppId" description="Missing App ID" />

    <template v-else>
      <AppBasicInfoCard :loading="productLoading" :product="productDetail" :image-url="productImageUrl" />

      <AppScoreCard :score="meter?.score || null" />

      <AppMetricsCard
        :loading="loading"
        :meter="meter"
        :app-id="currentAppId"
        :date="date"
        :selected-app-name="selectedAppName"
      />

      <AppDeviceSection
        :overview-loading="deviceOverviewLoading"
        :overview="deviceOverview"
        :device-list="deviceList"
        :active-loading="activeDevicesLoading"
        :active-devices="activeDevices"
        :lost-loading="lostDevicesLoading"
        :lost-devices="lostDevices"
        :all-loading="allDevicesLoading"
        :all-devices="allDevices"
        :detail-visible="deviceDetailVisible"
        :detail-loading="deviceDetailLoading"
        :detail="deviceDetail"
        @refresh-overview="fetchDeviceOverview"
        @show-list="showDeviceList"
        @refresh-list="refreshDeviceList"
        @open-detail="openDeviceDetail"
        @update:detailVisible="deviceDetailVisible = $event"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import AppBasicInfoCard from '@/views/meter/components/AppBasicInfoCard.vue'
import AppMetricsCard from '@/views/meter/components/AppMetricsCard.vue'
import AppScoreCard from '@/views/meter/components/AppScoreCard.vue'
import AppDeviceSection from '@/views/meter/components/AppDeviceSection.vue'
import { getAppMeter, getDeviceOverview, getActiveDevices, getLostDevices, getAllDevices, getDeviceDetail } from '@/api/meter'
import { getProduct } from '@/api/products'
import type { AppMeterVO, DeviceOverviewVO, DeviceActiveVO, DeviceDetailVO } from '@/types/meter'
import type { Product } from '@/types/api/product'

const props = defineProps<{
  appId?: number | string | null
}>()

const route = useRoute()
const router = useRouter()

const currentAppId = ref<number | null>(null)
const date = ref('')

const loading = ref(false)
const productLoading = ref(false)
const meter = ref<AppMeterVO | null>(null)
const productDetail = ref<Product | null>(null)
const selectedAppName = ref('')
const inited = ref(false)

const deviceOverviewLoading = ref(false)
const deviceOverview = ref<DeviceOverviewVO | null>(null)
const deviceList = ref<'active' | 'lost' | 'all' | null>(null)

const activeDevicesLoading = ref(false)
const activeDevices = ref<DeviceActiveVO[]>([])

const lostDevicesLoading = ref(false)
const lostDevices = ref<DeviceActiveVO[]>([])

const allDevicesLoading = ref(false)
const allDevices = ref<DeviceActiveVO[]>([])

const deviceDetailVisible = ref(false)
const deviceDetailLoading = ref(false)
const deviceDetail = ref<DeviceDetailVO | null>(null)

const productImageUrl = computed(() => {
  if (!productDetail.value) return ''
  return (
    (productDetail.value as any).garminImageUrl ||
    (productDetail.value as any).rawImageUrl ||
    (productDetail.value as any).bannerImageUrl ||
    ''
  )
})

const resolveAppId = (value: number | string | null | undefined) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  if (typeof value === 'string' && value.trim()) {
    const id = Number(value)
    return Number.isFinite(id) ? id : null
  }
  return null
}

const isEmbedded = computed(() => props.appId !== undefined)

const fetchDeviceOverview = async () => {
  if (!currentAppId.value) return
  deviceOverviewLoading.value = true
  try {
    const res = await getDeviceOverview(String(currentAppId.value))
    deviceOverview.value = res.data || null
  } catch {
    deviceOverview.value = null
  } finally {
    deviceOverviewLoading.value = false
  }
}

const showDeviceList = async (type: 'active' | 'lost' | 'all') => {
  deviceList.value = type
  if (type === 'active') await fetchActiveDevices()
  else if (type === 'lost') await fetchLostDevices()
  else await fetchAllDevices()
}

const refreshDeviceList = async (type: 'active' | 'lost' | 'all') => {
  if (type === 'active') await fetchActiveDevices()
  else if (type === 'lost') await fetchLostDevices()
  else await fetchAllDevices()
}

const fetchActiveDevices = async () => {
  if (!currentAppId.value) return
  activeDevicesLoading.value = true
  try {
    const res = await getActiveDevices(String(currentAppId.value))
    activeDevices.value = res.data || []
  } catch {
    activeDevices.value = []
  } finally {
    activeDevicesLoading.value = false
  }
}

const fetchLostDevices = async () => {
  if (!currentAppId.value) return
  lostDevicesLoading.value = true
  try {
    const res = await getLostDevices(String(currentAppId.value))
    lostDevices.value = res.data || []
  } catch {
    lostDevices.value = []
  } finally {
    lostDevicesLoading.value = false
  }
}

const fetchAllDevices = async () => {
  if (!currentAppId.value) return
  allDevicesLoading.value = true
  try {
    const res = await getAllDevices(String(currentAppId.value))
    allDevices.value = res.data || []
  } catch {
    allDevices.value = []
  } finally {
    allDevicesLoading.value = false
  }
}

const openDeviceDetail = async (token: string) => {
  if (!currentAppId.value) return
  deviceDetailVisible.value = true
  deviceDetailLoading.value = true
  deviceDetail.value = null
  try {
    const res = await getDeviceDetail(String(currentAppId.value), token)
    deviceDetail.value = res.data || null
  } catch {
    ElMessage.error('Failed to load device detail')
  } finally {
    deviceDetailLoading.value = false
  }
}

const fetchAppName = async () => {
  if (!currentAppId.value) {
    selectedAppName.value = ''
    productDetail.value = null
    return
  }
  productLoading.value = true
  try {
    const res = await getProduct(currentAppId.value)
    if (res.code === 0 && res.data) {
      productDetail.value = res.data
      selectedAppName.value = (res.data as any).name || ''
    }
  } catch {
    productDetail.value = null
  } finally {
    productLoading.value = false
  }
}

const syncQuery = async () => {
  if (isEmbedded.value) return
  const nextQuery: Record<string, any> = { ...route.query }
  if (date.value) nextQuery.date = date.value
  else delete nextQuery.date
  await router.replace({ query: nextQuery })
}

const fetchMeter = async () => {
  if (!currentAppId.value) {
    meter.value = null
    return
  }

  loading.value = true
  try {
    const res = await getAppMeter(currentAppId.value, date.value || undefined)
    meter.value = res.data || null
  } catch {
    meter.value = null
    ElMessage.error('Failed to load app metrics')
  } finally {
    loading.value = false
  }
}

const fetchAll = async () => {
  await fetchAppName()
  await Promise.all([fetchMeter(), fetchDeviceOverview()])
  deviceList.value = null
}

watch(date, async () => {
  if (!inited.value) return
  await syncQuery()
  await fetchAll()
})

watch(
  () => props.appId,
  async (value) => {
    if (!isEmbedded.value) return
    currentAppId.value = resolveAppId(value)
    date.value = ''
    deviceList.value = null
    deviceDetailVisible.value = false
    deviceDetail.value = null

    if (!inited.value) return

    if (currentAppId.value) await fetchAll()
    else {
      meter.value = null
      productDetail.value = null
      selectedAppName.value = ''
      deviceOverview.value = null
      activeDevices.value = []
      lostDevices.value = []
      allDevices.value = []
    }
  },
  { immediate: true },
)

onMounted(async () => {
  if (!isEmbedded.value) {
    const pAppId = route.params.appId
    const qDate = route.query.date

    currentAppId.value = resolveAppId(typeof pAppId === 'string' ? pAppId : null)

    if (typeof qDate === 'string') {
      date.value = qDate
    }
  }

  if (currentAppId.value) {
    await fetchAll()
  }

  inited.value = true
})
</script>

<style scoped>
.meter-app-detail-page { padding: 16px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
.filters { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
</style>
