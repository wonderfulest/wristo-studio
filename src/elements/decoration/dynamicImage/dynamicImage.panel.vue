<template>
  <div class="dynamic-image-panel">
    <div class="dynamic-image-list">
      <div v-for="(item, index) in items" :key="item.id" class="dynamic-image-row" draggable="true"
        @dragstart="draggedIndex = Number(index)" @dragover.prevent @drop="dropAt(Number(index))">
        <span class="drag-handle" aria-hidden="true">⋮⋮</span>
        <img :src="item.imageUrl" :alt="item.expression.source" class="asset-thumbnail" :style="thumbnailStyle" />
        <code class="expression-summary">{{ item.expression.source }}</code>
        <div class="row-actions">
          <el-button size="small" type="danger" plain @click.stop="removeItem(Number(index))">{{ t('common.delete') }}</el-button>
          <el-button size="small" @click="openEdit(Number(index))">{{ t('common.edit') }}</el-button>
        </div>
      </div>
    </div>
    <el-button class="add-button" type="primary" plain @click="openAdd">＋ {{ t('dynamicImage.addItem') }}</el-button>
    <TokenPreviewControls :tokens="referencedTokens" />
    <el-dialog v-model="dialogVisible" :title="editingIndex === null ? t('dynamicImage.addItem') : t('dynamicImage.editItem')"
      width="min(560px, 92vw)" append-to-body destroy-on-close>
      <div class="edit-form">
        <el-button v-if="editingIndex === null" class="copy-group-button" plain @click="copyDialogVisible = true">
          {{ t('dynamicImage.copyExistingGroup') }}
        </el-button>
        <AssetPicker :selected-url="draftImageUrl" :selected-asset-id="draftAssetId" asset-type="image"
          :on-select="selectDraftAsset" :on-upload="selectDraftAsset" />
        <ExpressionEditor v-model="draftExpression" :error="expressionError" />
      </div>
      <template #footer>
        <el-button v-if="editingIndex !== null" type="danger" plain @click="removeEditingItem">{{ t('common.delete') }}</el-button>
        <span class="footer-spacer" />
        <el-button @click="dialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="saveDraft">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>
    <DynamicImageGroupCopyDialog v-model="copyDialogVisible" @copy="handleCopyGroup" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
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
import { appendCopiedDynamicImageItems } from './dynamicImage.copyModel'
import { calculateDynamicImageThumbnailSize, resolveDynamicImagePreviewSource, resolvePreviewAwareNewExpression } from './dynamicImage.panelModel'

const props = defineProps<{ config?: any; element?: any; applyPatch?: (patch: Record<string, any>) => void }>()
const { t } = useI18n()
const expressionPreviewStore = useExpressionPreviewStore()
const messageStore = useMessageStore()
const model = computed(() => props.config ?? props.element ?? {})
const items = computed<DynamicImageItem[]>(() => model.value.items ?? [])
const dialogVisible = ref(false)
const copyDialogVisible = ref(false)
const editingIndex = ref<number | null>(null)
const draftImageUrl = ref('')
const draftAssetId = ref<number | undefined>()
const draftExpression = ref('false')
const expressionError = ref('')
const draggedIndex = ref<number | null>(null)
const referencedTokens = computed(() => getReferencedTokenDefinitions(resolveDynamicImagePreviewSource(items.value)))
const thumbnailStyle = computed(() => {
  const size = calculateDynamicImageThumbnailSize(Number(model.value.width), Number(model.value.height))
  return { width: `${size.width}px`, height: `${size.height}px` }
})

const commitItems = (next: DynamicImageItem[]) => props.applyPatch?.({ items: next })
const resetDraft = () => { draftImageUrl.value = ''; draftAssetId.value = undefined; draftExpression.value = 'false'; expressionError.value = '' }
const openAdd = () => {
  editingIndex.value = null
  resetDraft()
  draftExpression.value = resolvePreviewAwareNewExpression(items.value, expressionPreviewStore.tokenValues)
  dialogVisible.value = true
}
const openEdit = (index: number) => {
  const item = items.value[index]
  editingIndex.value = index; draftImageUrl.value = item.imageUrl; draftAssetId.value = item.assetId
  draftExpression.value = item.expression.source; expressionError.value = ''; dialogVisible.value = true
}
const selectDraftAsset = (url: string, asset: AnalogAssetVO) => {
  draftImageUrl.value = asset.file?.previewUrl || asset.file?.url || url; draftAssetId.value = asset.id
}
const saveDraft = () => {
  if (!draftImageUrl.value.trim()) { expressionError.value = t('dynamicImage.assetRequired'); return }
  try {
    const item: DynamicImageItem = {
      id: editingIndex.value === null ? nanoid() : items.value[editingIndex.value].id,
      imageUrl: draftImageUrl.value, assetId: draftAssetId.value,
      expression: parseExpression(draftExpression.value, DEFAULT_EXPRESSION_TOKEN_CATALOG),
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
  commitItems(appendCopiedDynamicImageItems(items.value, sourceItems, nanoid))
  dialogVisible.value = false
  messageStore.success(t('dynamicImage.rulesAppended', { count: sourceItems.length }))
}
const dropAt = (targetIndex: number) => {
  const sourceIndex = draggedIndex.value; draggedIndex.value = null
  if (sourceIndex === null || sourceIndex === targetIndex) return
  const next = [...items.value]; const [moved] = next.splice(sourceIndex, 1); next.splice(targetIndex, 0, moved); commitItems(next)
}
</script>

<style scoped>
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
.edit-form { display: grid; gap: 18px; }
.copy-group-button { width: 100%; margin: 0; }
:deep(.el-dialog__footer) { display: flex; align-items: center; }
.footer-spacer { flex: 1; }
</style>
