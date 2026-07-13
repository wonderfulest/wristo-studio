<template>
  <div class="settings-section">
    <el-form :model="currentModel" label-position="left" label-width="100px">
      <el-form-item :label="t('elementSettings.width')">
        <el-input-number v-model.number="currentModel.width" :min="10" :max="500" @change="(v: number) => applyUpdate({ width: v })" />
      </el-form-item>
      <el-form-item :label="t('elementSettings.height')">
        <el-input-number v-model.number="currentModel.height" :min="10" :max="500" @change="(v: number) => applyUpdate({ height: v })" />
      </el-form-item>
      <el-form-item label-width="0">
        <div class="polygon-editor-card">
          <div class="polygon-editor-header">
            <strong>{{ t('elementSettings.vertices', { count: editorState.pointCount, max: 8 }) }}</strong>
            <el-button v-if="!editing" size="small" @click="editing = true">{{ t('elementSettings.editVertices') }}</el-button>
          </div>
          <template v-if="editing">
            <GoalBarPolygonMiniEditor
              ref="editorRef"
              mode="edit"
              :initial-points="initialPoints"
              @state="onEditorState"
              @commit="commitPoints"
              @cancel="cancelEditing"
            />
            <p class="editor-hint">{{ t('elementSettings.polygonEditHint') }}</p>
            <div class="polygon-editor-actions">
              <el-button size="small" @click="cancelEditing">{{ t('common.cancel') }}</el-button>
              <el-button type="primary" size="small" :disabled="!editorState.valid" @click="editorRef?.requestCommit()">{{ t('common.done') }}</el-button>
            </div>
          </template>
        </div>
      </el-form-item>
      <el-form-item :label="t('elementSettings.fillColor')">
        <color-picker
          v-model="currentModel.fill"
          :enable-gradient="isConvex"
          :gradient-enabled="Boolean(currentModel.gradientEnabled)"
          :gradient-start-color="currentModel.gradientStartColor ?? currentModel.fill"
          :gradient-end-color="currentModel.gradientEndColor ?? currentModel.fill"
          @change="(v: string) => applyUpdate({ fill: v })"
          @gradient-change="handleGradientChange"
        />
      </el-form-item>
      <el-form-item v-if="isConvex && currentModel.gradientEnabled" :label="t('elementSettings.gradientDirection')">
        <el-select v-model="currentModel.gradientDirection" @change="(v: string) => applyUpdate({ gradientDirection: v })">
          <el-option :label="t('elementSettings.leftToRight')" value="leftToRight" />
          <el-option :label="t('elementSettings.rightToLeft')" value="rightToLeft" />
          <el-option :label="t('elementSettings.topToBottom')" value="topToBottom" />
          <el-option :label="t('elementSettings.bottomToTop')" value="bottomToTop" />
        </el-select>
      </el-form-item>
      <el-alert v-if="!isConvex" class="solid-only-hint" type="info" :closable="false" show-icon :title="t('elementSettings.concavePolygonSolidOnly')" />
      <el-form-item :label="t('elementSettings.borderColor')">
        <color-picker v-model="currentModel.stroke" @change="(v: string) => applyUpdate({ stroke: v })" />
      </el-form-item>
      <el-form-item :label="t('elementSettings.borderWidth')">
        <el-input-number v-model.number="currentModel.strokeWidth" :min="0" :max="20" @change="(v: number) => applyUpdate({ strokeWidth: v })" />
      </el-form-item>
      <el-form-item :label="t('elementSettings.opacity')">
        <el-slider v-model.number="currentModel.opacity" :min="0" :max="1" :step="0.1" @change="(v: number) => applyUpdate({ opacity: v })" />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import * as elementManager from '@/engine/managers/elementManager'
import ColorPicker from '@/components/color-picker/index.vue'
import GoalBarPolygonMiniEditor from '@/elements/goal/goalBar/GoalBarPolygonMiniEditor.vue'
import { useI18n } from '@/i18n'
import { clonePolygonPoints, isConvexPolygonPoints, normalizePolygonPoints, type PolygonPoint } from './polygon.geometry'

const props = defineProps<{ element?: any; config?: Record<string, any> | null; applyPatch?: (patch: Record<string, any>) => void }>()
const { t } = useI18n()
const currentModel = computed<any>(() => props.config ?? props.element ?? {})
const editing = ref(false)
const editorRef = ref<{ requestCommit(): void } | null>(null)
const initialPoints = computed(() => clonePolygonPoints(normalizePolygonPoints(currentModel.value.polygonPoints)))
const editorState = ref({ valid: true, pointCount: initialPoints.value.length })
const isConvex = computed(() => isConvexPolygonPoints(currentModel.value.polygonPoints))

function applyUpdate(patch: Record<string, any>) {
  if (props.applyPatch && props.config) props.applyPatch(patch)
  else if (props.element) elementManager.updateElement(props.element, patch)
}
function onEditorState(state: { valid: boolean; pointCount: number }) { editorState.value = state }
function commitPoints(points: PolygonPoint[]) {
  applyUpdate({
    polygonPoints: clonePolygonPoints(points),
    ...(isConvexPolygonPoints(points) ? {} : { gradientEnabled: false }),
  })
  editing.value = false
}
function cancelEditing() { editing.value = false }
function handleGradientChange(value: { enabled: boolean; startColor: string; endColor: string }) {
  applyUpdate({
    gradientEnabled: isConvex.value && value.enabled,
    gradientStartColor: value.startColor,
    gradientEndColor: value.endColor,
    gradientDirection: currentModel.value.gradientDirection ?? 'leftToRight',
  })
}
</script>

<style scoped>
.settings-section { padding: 16px; }
.el-form-item { margin-bottom: 16px; }
.polygon-editor-card { width: 100%; }
.polygon-editor-header, .polygon-editor-actions { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.polygon-editor-actions { justify-content: flex-end; margin-top: 8px; }
.editor-hint { margin: 8px 0; color: var(--el-text-color-secondary); font-size: 12px; line-height: 1.5; }
.solid-only-hint { margin-bottom: 16px; }
</style>
