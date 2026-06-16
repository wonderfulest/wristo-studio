<template>
  <div class="pending-go-live">
    <div class="header">
      <h2>{{ t('project.pendingGoLive') }}</h2>
    </div>

    <el-card shadow="never">
      <el-table :data="pendingStore.items" v-loading="pendingStore.loading" style="width: 100%">
        <el-table-column :label="t('pending.image')" width="90">
          <template #default="{ row }">
            <el-image
              v-if="row.garminImageUrl"
              :src="row.garminImageUrl"
              style="width: 64px; height: 64px; object-fit: cover; border-radius: 6px;"
              :preview-src-list="[row.garminImageUrl]"
              preview-teleported
            />
          </template>
        </el-table-column>
        <el-table-column prop="name" :label="t('pending.name')" min-width="120" />
        <el-table-column prop="designId" :label="t('pending.design')" min-width="200" />
        <el-table-column prop="appId" :label="t('pending.appId')" width="80" />
        <el-table-column :label="t('pending.lastGoLive')" min-width="180">
          <template #default="{ row }">
            <span>{{ formatDateNullable(row.lastGoLive) }}</span>
          </template>
        </el-table-column>
        <el-table-column :label="t('pending.store')" min-width="140">
          <template #default="{ row }">
            <a v-if="row.garminStoreUrl" :href="row.garminStoreUrl" target="_blank" rel="noopener noreferrer">{{ t('pending.garminStore') }}</a>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column :label="t('pending.release')" min-width="360">
          <template #default="{ row }">
            <span>{{ row.release?.releaseNote ?? '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column :label="t('pending.actions')" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" :disabled="!row.release?.packageUrl" @click="download(row)">{{ t('pending.download') }}</el-button>
            <el-button type="success" size="small" @click="goLive(row)">{{ t('pending.goLive') }}</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- Go Live Dialog -->
    <GoLiveDialog ref="goLiveDialog" @success="handleGoLiveSuccess" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import dayjs from 'dayjs'
import type { Product } from '@/types/api/product'
import { useMessageStore } from '@/stores/message'
import { designApi } from '@/api/wristo/design'
import type { Design } from '@/types/api/design'
import GoLiveDialog from '@/components/dialogs/GoLiveDialog.vue'
import { usePendingGoLiveStore } from '@/stores/pendingGoLive'
import type { ApiResponse } from '@/types/api/api'
import { useI18n } from '@/i18n'
import { useStudioMembershipGate } from '@/composables/useStudioMembershipGate'
import { useUserStore } from '@/stores/user'
import { downloadPackageFile } from '@/utils/packageDownload'

const messageStore = useMessageStore()
const pendingStore = usePendingGoLiveStore()
const { t } = useI18n()
const membershipGate = useStudioMembershipGate()
const userStore = useUserStore()
type GoLiveDialogRef = { show: (design: Design) => void }
const goLiveDialog = ref<GoLiveDialogRef | null>(null)

const getCurrentDeviceParams = () => {
  const deviceId = userStore.userInfo?.device?.deviceId
  return deviceId ? { device: deviceId } : undefined
}

const formatDateNullable = (date: number | undefined): string => {
  if (!date) return t('common.never')
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

onMounted(() => {
  pendingStore.fetch()
})

const goLive = async (row: Product): Promise<void> => {
  if (!membershipGate.requirePublish()) return
  try {
    // 获取完整 design 对象（包含 user, product, payment, release, cover, category, bundle）
    const res = await designApi.getDesignByUid(row.designId, getCurrentDeviceParams()) as ApiResponse<Design>
    const design = res.data as Design
    if (!design) {
      messageStore.error(t('project.loadDesignFailed'))
      return
    }
    if (goLiveDialog.value && typeof goLiveDialog.value.show === 'function') {
      goLiveDialog.value.show(design)
    }
  } catch (e) {
    messageStore.error(t('project.loadDesignFailed'))
  }
}

const download = async (row: Product): Promise<void> => {
  if (!membershipGate.requireExport()) return
  const url = row.release?.packageUrl
  if (url) {
    await downloadPackageFile(url, row.name, 'iq')
  } else {
    messageStore.error(t('pending.noPackage'))
  }
}

const handleGoLiveSuccess = (): void => {
  pendingStore.fetch()
}
</script>

<style scoped>
.pending-go-live {
  padding: 0 0 16px 0;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

h2 {
  margin: 0;
  font-size: 20px;
}
</style>
