<template>
  <el-dialog
    :model-value="modelValue"
    :title="t('dynamicImage.quickImportTitle')"
    width="min(720px, 94vw)"
    append-to-body
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="quick-import-dialog">
      <p class="quick-import-description">{{ t('dynamicImage.quickImportDescription') }}</p>
      <div class="quick-import-actions">
        <el-button type="primary" plain :disabled="busy" @click="imageInput?.click()">
          {{ t('dynamicImage.quickImportChooseImages') }}
        </el-button>
        <el-button plain :disabled="busy" @click="folderInput?.click()">
          {{ t('dynamicImage.quickImportChooseFolder') }}
        </el-button>
      </div>
      <input ref="imageInput" hidden type="file" accept=".png,.svg" multiple @change="handleInput" />
      <input ref="folderInput" hidden type="file" accept=".png,.svg" multiple webkitdirectory @change="handleInput" />

      <el-alert v-if="collectionErrors.length" type="error" :closable="false" show-icon>
        <template #title>{{ t('dynamicImage.quickImportReadErrors', { count: collectionErrors.length }) }}</template>
      </el-alert>

      <div v-if="plan" class="quick-import-summary">
        <div v-for="group in plan.groups" :key="group.kind" class="quick-import-group">
          <strong>{{ groupLabel(group.kind) }}</strong>
          <span>{{ t('dynamicImage.quickImportRuleCount', { count: group.entries.length }) }}</span>
          <span>{{ group.width }} × {{ group.height }}</span>
        </div>
        <el-alert v-if="plan.errors.length" type="error" :closable="false" show-icon>
          <template #title>{{ t('dynamicImage.quickImportValidationErrors', { count: plan.errors.length }) }}</template>
          <ul class="issue-list">
            <li v-for="(issue, index) in plan.errors" :key="`error-${index}`">{{ issueLabel(issue) }}</li>
          </ul>
        </el-alert>
        <el-alert v-if="plan.warnings.length" type="warning" :closable="false" show-icon>
          <template #title>{{ t('dynamicImage.quickImportWarnings', { count: plan.warnings.length }) }}</template>
          <ul class="issue-list">
            <li v-for="(issue, index) in plan.warnings" :key="`warning-${index}`">{{ issueLabel(issue) }}</li>
          </ul>
        </el-alert>
      </div>
      <el-progress v-if="busy" :percentage="progress" :stroke-width="8" />
    </div>
    <template #footer>
      <el-button :disabled="busy" @click="emit('update:modelValue', false)">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" :loading="busy" :disabled="!canImport" @click="confirmImport">
        {{ t('dynamicImage.quickImportConfirm') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { analogAssetApi } from '@/api/wristo/analogAsset'
import { useI18n } from '@/i18n'
import { useMessageStore } from '@/stores/message'
import type { DynamicImageImportIssue, DynamicImageImportKind, DynamicImageImportPlan, MaterializedDynamicImageGroup } from './dynamicImage.quickImport'
import { buildDynamicImageImportPlan, collectDynamicImageImportFiles, materializeDynamicImageImportGroups } from './dynamicImage.quickImport'

const props = defineProps<{
  modelValue: boolean
  applyGroups: (groups: MaterializedDynamicImageGroup[]) => Promise<void>
}>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()
const { t } = useI18n()
const messageStore = useMessageStore()
const imageInput = ref<HTMLInputElement | null>(null)
const folderInput = ref<HTMLInputElement | null>(null)
const plan = ref<DynamicImageImportPlan | null>(null)
const collectionErrors = ref<DynamicImageImportIssue[]>([])
const busy = ref(false)
const progress = ref(0)
const canImport = computed(() => Boolean(plan.value?.groups.length && !plan.value.errors.length && !collectionErrors.value.length && !busy.value))

const groupLabel = (kind: DynamicImageImportKind) => t(`dynamicImage.quickImportGroup.${kind}`)
const issueLabel = (issue: DynamicImageImportIssue) => t(`dynamicImage.quickImportIssue.${issue.code}`, {
  file: issue.fileName || '',
  group: issue.kind ? groupLabel(issue.kind) : '',
  value: issue.value ?? '',
  values: issue.values?.join(', ') || '',
})

const handleInput = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  if (!files.length) return
  busy.value = true
  progress.value = 10
  try {
    const collected = await collectDynamicImageImportFiles(files)
    collectionErrors.value = collected.errors
    plan.value = buildDynamicImageImportPlan(collected.files)
    progress.value = 100
  } finally {
    busy.value = false
  }
}

const confirmImport = async () => {
  if (!canImport.value || !plan.value) return
  busy.value = true
  progress.value = 0
  const total = plan.value.groups.reduce((count, group) => count + group.entries.length, 0)
  let uploaded = 0
  try {
    const groups = await materializeDynamicImageImportGroups(plan.value.groups, {
      upload: async (file) => {
        const response = await analogAssetApi.upload(file, 'image', false)
        const asset = response.data
        const imageUrl = asset?.file?.previewUrl || asset?.file?.url || ''
        if (!asset || !imageUrl) throw new Error(`Upload failed: ${file.name}`)
        uploaded += 1
        progress.value = Math.round(uploaded / total * 100)
        return { assetId: asset.id, imageUrl }
      },
    })
    await props.applyGroups(groups)
    emit('update:modelValue', false)
  } catch (error) {
    messageStore.error(error instanceof Error ? error.message : t('asset.uploadFailed'))
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.quick-import-dialog { display: grid; gap: 16px; }
.quick-import-description { margin: 0; color: var(--el-text-color-secondary); line-height: 1.6; }
.quick-import-actions { display: flex; flex-wrap: wrap; gap: 10px; }
.quick-import-actions :deep(.el-button + .el-button) { margin-left: 0; }
.quick-import-summary { display: grid; gap: 10px; }
.quick-import-group { display: grid; grid-template-columns: minmax(120px, 1fr) auto auto; gap: 16px; align-items: center; padding: 10px 12px; border: 1px solid var(--el-border-color-lighter); border-radius: 8px; }
.issue-list { margin: 8px 0 0; padding-left: 20px; }
</style>
