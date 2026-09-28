<template>
  <div class="dynamic-image-panel">
    <el-form label-position="left" label-width="120px">
      <el-form-item :label="t('elementSettings.angle')">
        <el-input-number
          :model-value="Number(model.rotation ?? 0)"
          :min="-360"
          :max="360"
          @change="(value: number) => props.applyPatch?.({ rotation: Number(value) })"
        />
      </el-form-item>
    </el-form>
    <el-form label-position="top">
      <el-form-item :label="t('dynamicImage.driveMode')">
        <el-radio-group class="drive-mode" :model-value="goalMode ? 'goalProgress' : 'expression'" @change="setDriveMode">
          <el-radio-button label="expression">{{ t('dynamicImage.expressionMode') }}</el-radio-button>
          <el-radio-button label="goalProgress">{{ t('dynamicImage.goalMode') }}</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <template v-if="goalMode">
        <GoalPropertyField :model-value="model.goalProperty || ''" @update:model-value="bindGoal" />
        <p class="goal-help">{{ t('dynamicImage.goalHelp') }}</p>
        <el-form-item :label="t('dynamicImage.previewProgress')">
          <el-slider :model-value="Math.round((model.progress || 0) * 100)" :min="0" :max="100" show-input
            @input="(value: number) => props.applyPatch?.({ progress: value / 100 })" />
        </el-form-item>
        <el-alert v-for="error in goalErrors" :key="error" :title="error" type="error" :closable="false" />
      </template>
    </el-form>
    <div class="dynamic-image-list">
      <div v-for="(item, index) in items" :key="item.id" class="dynamic-image-row" draggable="true"
        @dragstart="draggedIndex = Number(index)" @dragover.prevent @drop="dropAt(Number(index))">
        <span class="drag-handle" aria-hidden="true">⋮⋮</span>
        <img :src="item.imageUrl" :alt="goalMode ? `${Math.round((item.minProgress || 0) * 100)}%` : item.expression?.source || 'false'" class="asset-thumbnail" :style="thumbnailStyle" />
        <el-input-number v-if="goalMode" :model-value="Math.round((item.minProgress || 0) * 100)"
          :min="0" :max="100" :step="10" @change="(value: number) => setThreshold(Number(index), value)" />
        <code v-else class="expression-summary">{{ item.expression?.source || 'false' }}</code>
        <div class="row-actions">
          <el-button size="small" type="danger" plain @click.stop="removeItem(Number(index))">{{ t('common.delete') }}</el-button>
          <el-button size="small" @click="openEdit(Number(index))">{{ t('common.edit') }}</el-button>
        </div>
      </div>
    </div>
    <div v-if="!goalMode" class="quick-import-type">
      <span class="quick-import-type-label">{{ t('dynamicImage.quickImportType') }}</span>
      <el-radio-group :model-value="quickImportKind" size="small" @change="selectQuickImportKind">
        <el-radio-button label="all">{{ t('dynamicImage.quickImportType.general') }}</el-radio-button>
        <el-radio-button label="weekday">{{ t('dynamicImage.quickImportType.weekday') }}</el-radio-button>
        <el-radio-button label="weather">{{ t('dynamicImage.quickImportType.weather') }}</el-radio-button>
      </el-radio-group>
    </div>
    <div class="panel-actions">
      <el-button class="add-button" type="primary" plain @click="openAdd">＋ {{ t('dynamicImage.addItem') }}</el-button>
      <el-button v-if="!goalMode" class="quick-import-button" plain @click="quickImportVisible = true">{{ t('dynamicImage.quickImport') }}</el-button>
    </div>
    <TokenPreviewControls v-if="!goalMode" :tokens="referencedTokens" />
    <el-dialog v-model="dialogVisible" :title="editingIndex === null ? t('dynamicImage.addItem') : t('dynamicImage.editItem')"
      width="min(560px, 92vw)" append-to-body destroy-on-close>
      <div class="edit-form">
        <el-button v-if="editingIndex === null" class="copy-group-button" plain @click="copyDialogVisible = true">
          {{ t('dynamicImage.copyExistingGroup') }}
        </el-button>
        <AssetPicker :selected-url="draftImageUrl" :selected-asset-id="draftAssetId" asset-type="image"
          :on-select="selectDraftAsset" :on-upload="selectDraftAsset" />
        <el-form-item v-if="goalMode" :label="t('dynamicImage.startPercent')">
          <el-input-number v-model="draftPercent" :min="0" :max="100" :precision="0" />
        </el-form-item>
        <el-alert v-if="goalMode && expressionError" :title="expressionError" type="error" :closable="false" />
        <ExpressionEditor v-if="!goalMode" v-model="draftExpression" :error="expressionError" />
      </div>
      <template #footer>
        <el-button v-if="editingIndex !== null" type="danger" plain @click="removeEditingItem">{{ t('common.delete') }}</el-button>
        <span class="footer-spacer" />
        <el-button @click="dialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="saveDraft">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>
    <DynamicImageGroupCopyDialog v-model="copyDialogVisible" @copy="handleCopyGroup" />
    <DynamicImageQuickImportDialog
      v-model="quickImportVisible"
      :allowed-kinds="allowedQuickImportKinds"
      :apply-groups="handleQuickImported"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRaw } from 'vue'
import GoalPropertyField from '@/elements/common/settings/GoalPropertyField.vue'
import { usesGoalProgress, initializeGoalStages, nextGoalThreshold } from './dynamicImage.goal'
import { validateDynamicImage } from './dynamicImage.validation'
import { usePropertiesStore } from '@/stores/properties'
import { nanoid } from 'nanoid'
import AssetPicker from '@/components/asset-picker/index.vue'
import ExpressionEditor from '@/components/expression/ExpressionEditor.vue'
import TokenPreviewControls from '@/components/expression/TokenPreviewControls.vue'
import { getReferencedTokenDefinitions } from '@/components/expression/tokenPickerModel'
import { parseExpression } from '@/engine/expression/parser'
import { DEFAULT_EXPRESSION_TOKEN_CATALOG } from '@/engine/expression/tokenCatalog'
import { useExpressionPreviewStore } from '@/stores/expressionPreviewStore'
import { useMessageStore } from '@/stores/message'
import type { AnalogAssetVO } from '@/types/api/analog-asset'
import type { DynamicImageItem } from '@/types/elements/dynamicImage'
import { useI18n } from '@/i18n'
import DynamicImageGroupCopyDialog from './DynamicImageGroupCopyDialog.vue'
import DynamicImageQuickImportDialog from './DynamicImageQuickImportDialog.vue'
import { appendCopiedDynamicImageItems } from './dynamicImage.copyModel'
import { calculateDynamicImageThumbnailSize, resolveDynamicImagePreviewSource, resolvePreviewAwareNewExpression } from './dynamicImage.panelModel'
import { addElement, removeElement } from '@/engine/managers/elementManager'
import type { DynamicImageImportKind, MaterializedDynamicImageGroup } from './dynamicImage.quickImport'
import { useHistoryStore } from '@/stores/historyStore'

const props = defineProps<{ config?: any; element?: any; applyPatch?: (patch: Record<string, any>) => Promise<void> | void }>()
const { t } = useI18n()
const expressionPreviewStore = useExpressionPreviewStore()
const messageStore = useMessageStore()
const historyStore = useHistoryStore()
const model = computed(() => props.config ?? props.element ?? {})
const items = computed<DynamicImageItem[]>(() => model.value.items ?? [])
const goalMode = computed(() => usesGoalProgress(model.value))
const propertiesStore = usePropertiesStore()
const goalErrors = computed(() => goalMode.value ? validateDynamicImage(model.value, propertiesStore.properties) : [])
const setDriveMode = (selectionMode: 'expression' | 'goalProgress') => props.applyPatch?.({
  selectionMode, goalProperty: selectionMode === 'expression' ? '' : model.value.goalProperty || '',
  progress: model.value.progress ?? 0,
  items: selectionMode === 'goalProgress' ? initializeGoalStages(items.value) : items.value.map(item => ({ ...item, expression: item.expression ?? parseExpression('false', DEFAULT_EXPRESSION_TOKEN_CATALOG) })),
})
const bindGoal = (goalProperty: string) => props.applyPatch?.({ selectionMode: 'goalProgress', goalProperty })
const setThreshold = (index: number, value: number) => props.applyPatch?.({
  items: items.value.map((item, i) => i === index ? { ...item, minProgress: value / 100 } : item),
})
const dialogVisible = ref(false)
const copyDialogVisible = ref(false)
const quickImportVisible = ref(false)
const quickImportKind = ref<'all' | 'weekday' | 'weather'>('all')
const editingIndex = ref<number | null>(null)
const draftImageUrl = ref('')
const draftAssetId = ref<number | undefined>()
const draftExpression = ref('false')
const draftPercent = ref(0)
const expressionError = ref('')
const draggedIndex = ref<number | null>(null)
const referencedTokens = computed(() => getReferencedTokenDefinitions(resolveDynamicImagePreviewSource(items.value)))
const thumbnailStyle = computed(() => {
  const size = calculateDynamicImageThumbnailSize(Number(model.value.width), Number(model.value.height))
  return { width: `${size.width}px`, height: `${size.height}px` }
})
const allowedQuickImportKinds = computed<readonly DynamicImageImportKind[] | undefined>(() => {
  if (quickImportKind.value === 'all') return undefined
  return [quickImportKind.value]
})

const selectQuickImportKind = (value: 'all' | 'weekday' | 'weather') => {
  quickImportKind.value = value
}

const commitItems = (next: DynamicImageItem[]) => props.applyPatch?.({ items: next })
const resetDraft = () => { draftImageUrl.value = ''; draftAssetId.value = undefined; draftExpression.value = 'false'; expressionError.value = '' }
const openAdd = () => {
  editingIndex.value = null
  resetDraft()
  draftExpression.value = goalMode.value ? 'false' : resolvePreviewAwareNewExpression(items.value, expressionPreviewStore.tokenValues)
  draftPercent.value = Math.round((nextGoalThreshold(items.value) ?? 1) * 100)
  dialogVisible.value = true
}
const openEdit = (index: number) => {
  const item = items.value[index]
  editingIndex.value = index; draftImageUrl.value = item.imageUrl; draftAssetId.value = item.assetId
  draftPercent.value = Math.round((item.minProgress ?? 0) * 100)
  draftExpression.value = item.expression?.source || 'false'; expressionError.value = ''; dialogVisible.value = true
}
const selectDraftAsset = (url: string, asset: AnalogAssetVO) => {
  draftImageUrl.value = asset.file?.previewUrl || asset.file?.url || url; draftAssetId.value = asset.id
}
const saveDraft = () => {
  if (!draftImageUrl.value.trim()) { expressionError.value = t('dynamicImage.assetRequired'); return }
  try {
    if (goalMode.value && items.value.some((item, index) => index !== editingIndex.value && item.minProgress === draftPercent.value / 100)) {
      expressionError.value = t('dynamicImage.duplicateThreshold'); return
    }
    const item: DynamicImageItem = {
      id: editingIndex.value === null ? nanoid() : items.value[editingIndex.value].id,
      imageUrl: draftImageUrl.value, assetId: draftAssetId.value,
      expression: parseExpression(draftExpression.value, DEFAULT_EXPRESSION_TOKEN_CATALOG),
      ...(goalMode.value ? { minProgress: draftPercent.value / 100 } : {}),
    }
    const next = [...items.value]
    if (editingIndex.value === null) next.push(item); else next[editingIndex.value] = item
    commitItems(next); dialogVisible.value = false
  } catch (error) { expressionError.value = error instanceof Error ? error.message : String(error) }
}
const removeEditingItem = () => {
  if (editingIndex.value === null) return
  removeItem(editingIndex.value); dialogVisible.value = false
}
const removeItem = (itemIndex: number) => commitItems(items.value.filter((_, index) => index !== itemIndex))
const handleCopyGroup = (sourceItems: DynamicImageItem[]) => {
  const copied = appendCopiedDynamicImageItems(items.value, sourceItems, nanoid)
  commitItems(goalMode.value ? initializeGoalStages(copied) : copied)
  dialogVisible.value = false
  messageStore.success(t('dynamicImage.rulesAppended', { count: sourceItems.length }))
}
const handleQuickImported = async (groups: MaterializedDynamicImageGroup[]) => {
  const [first, ...additional] = groups
  if (!first) return
  const original = {
    width: Number(model.value.width ?? 1),
    height: Number(model.value.height ?? 1),
    items: structuredClone(toRaw(items.value)),
  }
  const created: any[] = []
  try {
    await historyStore.runWithoutRecording(async () => {
      await props.applyPatch?.({ width: first.width, height: first.height, items: first.items })
      for (const [index, group] of additional.entries()) {
        const offset = (index + 1) * 12
        const element = await addElement('dynamicImage', {
          id: '', eleType: 'dynamicImage',
          left: Number(model.value.left ?? 0) + offset,
          top: Number(model.value.top ?? 0) + offset,
          originX: model.value.originX ?? 'center', originY: model.value.originY ?? 'center',
          width: group.width, height: group.height, rotation: Number(model.value.rotation ?? 0),
          displayStates: structuredClone(toRaw(model.value.displayStates ?? { active: true, ambient: true })),
          items: group.items,
        } as any)
        if (element) created.push(element)
      }
    })
  } catch (error) {
    await historyStore.runWithoutRecording(async () => {
      created.reverse().forEach((element) => removeElement(element))
      await props.applyPatch?.(original)
    })
    throw error
  }
  historyStore.saveState('dynamic-image:quick-import', { captureConfig: true })
  messageStore.success(t('dynamicImage.quickImportSuccess', { count: groups.length }))
}
const dropAt = (targetIndex: number) => {
  const sourceIndex = draggedIndex.value; draggedIndex.value = null
  if (sourceIndex === null || sourceIndex === targetIndex) return
  const next = [...items.value]; const [moved] = next.splice(sourceIndex, 1); next.splice(targetIndex, 0, moved); commitItems(next)
}
</script>

<style scoped>
.goal-help { margin: 0 0 16px; color: var(--el-text-color-secondary); font-size: 13px; line-height: 1.5; }
.dynamic-image-panel { padding: 16px; display: grid; gap: 16px; }
.dynamic-image-list { display: grid; border: 1px solid var(--el-border-color-lighter); border-radius: 10px; overflow: hidden; }
.dynamic-image-row { display: grid; grid-template-columns: 18px 92px minmax(0, 1fr) auto; align-items: center; gap: 12px; min-height: 68px; padding: 8px 12px; background: var(--el-bg-color); }
.dynamic-image-row + .dynamic-image-row { border-top: 1px solid var(--el-border-color-lighter); }
.drag-handle { color: var(--el-text-color-placeholder); cursor: grab; user-select: none; }
.asset-thumbnail { justify-self: center; object-fit: fill; border-radius: 6px; background: var(--el-fill-color-light); }
.expression-summary { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--el-text-color-primary); }
.row-actions { display: flex; align-items: center; gap: 8px; }
.row-actions :deep(.el-button + .el-button) { margin-left: 0; }
.add-button { width: 100%; }
.panel-actions { display: grid; gap: 10px; }
.quick-import-type { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.quick-import-type-label { color: var(--el-text-color-secondary); font-size: 13px; }
.quick-import-button { width: 100%; margin: 0; }
.edit-form { display: grid; gap: 18px; }
.copy-group-button { width: 100%; margin: 0; }
:deep(.el-dialog__footer) { display: flex; align-items: center; }
.footer-spacer { flex: 1; }
</style>
