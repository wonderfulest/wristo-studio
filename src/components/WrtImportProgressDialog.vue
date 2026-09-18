<template>
  <el-dialog
    :model-value="state.active"
    :title="t('editor.wrtImportProgress.title')"
    width="min(440px, calc(100vw - 32px))"
    append-to-body
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
  >
    <div role="status" aria-live="polite" :aria-busy="state.active">
      <p class="import-file">{{ state.fileName }}</p>
      <p>{{ t(`editor.wrtImportProgress.${state.progress.stage}`) }}</p>
      <el-progress :percentage="state.progress.percentage" />
      <p v-if="state.progress.fontSlug" class="import-detail">
        {{ t('editor.wrtImportProgress.font', { name: state.progress.fontSlug, current: state.progress.fontIndex || 1, total: state.progress.fontTotal || 1 }) }}
        <span v-if="state.progress.fontSize"> · {{ state.progress.fontSize }} px</span>
      </p>
      <p class="import-hint">{{ t('editor.wrtImportProgress.wait') }}</p>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { useI18n } from '@/i18n'
import { useWrtImportProgressStore } from '@/stores/wrtImportProgress'

const state = useWrtImportProgressStore()
const { t } = useI18n()
</script>

<style scoped>
.import-file, .import-detail { overflow-wrap: anywhere; }
.import-file { font-weight: 600; }
.import-detail, .import-hint { color: var(--el-text-color-secondary); font-size: 13px; }
</style>
