<template>
  <div class="build-log-page">
    <div class="build-log-header">
      <div>
        <h1>{{ t('packagingLog.title') }}</h1>
        <p>{{ logPath || t('packagingLog.loadingPath') }}</p>
      </div>
      <el-button class="apple-button secondary" @click="reload">
        {{ t('common.refresh') }}
      </el-button>
    </div>

    <div class="build-log-panel">
      <div v-if="loading" class="build-log-state">
        <el-skeleton :rows="8" animated />
      </div>
      <el-empty v-else-if="errorMessage" :description="errorMessage" />
      <pre v-else class="build-log-content">{{ logContent || t('packagingLog.empty') }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { designApi } from '@/api/wristo/design'
import { useI18n } from '@/i18n'

const route = useRoute()
const { t } = useI18n()

const loading = ref(false)
const errorMessage = ref('')
const logPath = ref('')
const logContent = ref('')

const logId = computed(() => Number(route.params.id))

const loadLog = async () => {
  if (!Number.isFinite(logId.value) || logId.value <= 0) {
    errorMessage.value = t('packagingLog.invalidId')
    return
  }

  loading.value = true
  errorMessage.value = ''
  try {
    const response = await designApi.getPackagingBuildLog(logId.value)
    if (response.code === 0 && response.data) {
      logPath.value = response.data.path
      logContent.value = response.data.content
    } else {
      errorMessage.value = response.msg || t('packagingLog.loadFailed')
    }
  } catch (error: any) {
    errorMessage.value = error?.msg || error?.message || t('packagingLog.loadFailed')
  } finally {
    loading.value = false
  }
}

const reload = () => {
  loadLog()
}

onMounted(loadLog)
</script>

<style scoped>
.build-log-page {
  min-height: calc(100vh - 64px);
  padding: 24px;
  background: var(--studio-surface);
}

.build-log-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.build-log-header h1 {
  margin: 0;
  color: var(--studio-text);
  font-size: 22px;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: 0;
}

.build-log-header p {
  margin: 6px 0 0;
  color: var(--studio-text-muted);
  font-size: 13px;
  line-height: 1.45;
  word-break: break-all;
}

.build-log-panel {
  min-height: 520px;
  border: 1px solid var(--studio-border);
  border-radius: 8px;
  background: var(--studio-surface-raised);
  box-shadow: var(--studio-shadow-sm);
  overflow: hidden;
}

.build-log-state {
  padding: 20px;
}

.build-log-content {
  min-height: 520px;
  margin: 0;
  padding: 18px;
  overflow: auto;
  color: var(--studio-text);
  background: var(--studio-surface-soft);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 12px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}

@media (max-width: 720px) {
  .build-log-page {
    padding: 14px;
  }

  .build-log-header {
    flex-direction: column;
  }
}
</style>
