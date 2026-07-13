<template>
  <div class="settings-section">
    <el-form 
      ref="formRef"
      :model="currentModel" 
      label-position="left" 
      label-width="100px"
      status-icon
    >
      <GoalPropertyField
        v-model="currentModel.goalProperty"
        @change="updateElement"
      />

      <el-form-item :label="t('elementSettings.orientation')">
        <div class="goal-bar-icon-options" role="group" aria-label="Orientation">
          <button
            type="button"
            class="goal-bar-icon-option"
            :class="{ 'is-active': currentOrientation === 'horizontal' }"
            title="Horizontal"
            aria-label="Horizontal"
            :aria-pressed="currentOrientation === 'horizontal'"
            @click="setOrientation('horizontal')"
          >
            <Icon icon="mdi:arrow-expand-horizontal" />
          </button>
          <button
            type="button"
            class="goal-bar-icon-option"
            :class="{ 'is-active': currentOrientation === 'vertical' }"
            title="Vertical"
            aria-label="Vertical"
            :aria-pressed="currentOrientation === 'vertical'"
            @click="setOrientation('vertical')"
          >
            <Icon icon="mdi:arrow-expand-vertical" />
          </button>
        </div>
      </el-form-item>

      <el-form-item :label="t('elementSettings.shape')">
        <div class="goal-bar-icon-options" role="group" aria-label="Shape">
          <button
            type="button"
            class="goal-bar-icon-option"
            :class="{ 'is-active': currentShape === 'rectangle' }"
            :disabled="editorState.active"
            title="Rectangle"
            aria-label="Rectangle"
            :aria-pressed="currentShape === 'rectangle'"
            @click="onShapeChange('rectangle')"
          >
            <Icon icon="mdi:rectangle-outline" />
          </button>
          <button
            type="button"
            class="goal-bar-icon-option"
            :class="{ 'is-active': currentShape === 'customPolygon' }"
            :disabled="editorState.active"
            title="Custom Polygon"
            aria-label="Custom Polygon"
            :aria-pressed="currentShape === 'customPolygon'"
            @click="onShapeChange('customPolygon')"
          >
            <Icon icon="mdi:vector-polygon" />
          </button>
        </div>
      </el-form-item>

      <el-form-item v-if="isPolygonShape" class="polygon-editor-form-item" label-width="0">
        <div v-if="editorSession" class="polygon-editor-card">
          <div class="polygon-editor-header">
            <span class="polygon-editor-mode">
              {{ editorState.mode === 'create' ? t('common.create') : t('common.edit') }}
            </span>
            <strong>
              {{ t('elementSettings.vertices', { count: editorState.pointCount, max: 8 }) }}
            </strong>
          </div>
          <GoalBarPolygonMiniEditor
            :key="editorSession.key"
            :mode="editorSession.mode"
            :initial-points="editorSession.initialPoints"
            @state="onPolygonEditorState"
            @preview="onPolygonPreview"
            @commit="commitPolygonEditing"
            @cancel="cancelPolygonEditing"
          />
          <p class="polygon-editor-instruction">{{ polygonEditorInstruction }}</p>
          <p
            v-if="polygonEditorFeedback"
            class="polygon-editor-feedback"
            :class="{ 'is-error': polygonEditorFeedbackIsError }"
          >
            {{ polygonEditorFeedback }}
          </p>
          <div class="polygon-editor-actions">
            <el-button size="small" @click="cancelPolygonEditing">
              {{ t('common.cancel') }}
            </el-button>
            <el-button
              type="primary"
              size="small"
              :disabled="polygonDoneDisabled"
              @click="commitPolygonEditing"
            >
              {{ t('common.done') }}
            </el-button>
          </div>
        </div>
        <el-button
          v-else-if="persistedShape === 'customPolygon'"
          class="edit-polygon-button"
          :disabled="!hasValidPersistedPolygon"
          @click="startEditing('edit')"
        >
          {{ t('elementSettings.editVertices') }}
        </el-button>
      </el-form-item>

      <el-form-item v-if="!isSegmentMode && !isPolygonShape" :label="t('elementSettings.padding')">
        <el-input-number 
          v-model="currentModel.padding" 
          :min="0" 
          :max="10" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item :label="t('elementSettings.progressDirection')">
        <div class="goal-bar-icon-options" role="group" aria-label="Progress Direction">
          <button
            v-for="direction in availableProgressDirections"
            :key="direction"
            type="button"
            class="goal-bar-icon-option"
            :class="{ 'is-active': currentProgressDirection === direction }"
            :title="progressDirectionLabels[direction]"
            :aria-label="progressDirectionLabels[direction]"
            :aria-pressed="currentProgressDirection === direction"
            @click="setProgressDirection(direction)"
          >
            <Icon :icon="progressDirectionIcons[direction]" />
          </button>
        </div>
      </el-form-item>

      <el-form-item>
        <div class="progress-bar-segment-panel" :class="{ 'is-active': isSegmentMode }">
          <div class="progress-bar-segment-header">
            <div class="progress-bar-segment-title">
              <label>{{ t('elementSettings.segmentMode') }}</label>
              <span>{{ isSegmentMode ? t('common.on') : t('common.off') }}</span>
            </div>
            <el-switch :model-value="isSegmentMode" @change="onSegmentModeChange" />
          </div>

          <div v-if="isSegmentMode" class="progress-bar-segment-body">
            <div class="progress-bar-segment-preview" aria-hidden="true">
              <span
                v-for="index in segmentPreviewCount"
                :key="index"
                :class="{ active: index <= segmentPreviewActiveCount }"
              />
            </div>

            <div class="progress-bar-segment-grid">
              <div class="progress-bar-setting-field">
                <label>
                  {{ t('elementSettings.segments') }}
                  <strong>{{ segmentsLocal }}</strong>
                </label>
                <el-input-number
                  v-model="segmentsLocal"
                  :min="1"
                  :max="120"
                  :step="1"
                  controls-position="right"
                  @change="onSegmentsChange"
                />
              </div>
              <div class="progress-bar-setting-field">
                <label>
                  {{ t('elementSettings.gap') }}
                  <strong>{{ gapLocal }} px</strong>
                </label>
                <el-input-number
                  v-model="gapLocal"
                  :min="0"
                  :max="40"
                  :step="1"
                  controls-position="right"
                  @change="onGapChange"
                />
              </div>
            </div>
          </div>
        </div>
      </el-form-item>

      <el-form-item :label="t('elementSettings.activeColor')">
        <color-picker 
          v-model="currentModel.color"
          :enable-gradient="!isPolygonShape || isPolygonConvex"
          :gradient-enabled="Boolean(currentModel.gradientEnabled)"
          :gradient-start-color="currentModel.gradientStartColor ?? currentModel.color"
          :gradient-end-color="currentModel.gradientEndColor ?? currentModel.color"
          @change="handleMainColorChange"
          @gradient-change="handleGradientChange"
        />
      </el-form-item>
      <el-alert
        v-if="isPolygonShape && !isPolygonConvex"
        class="polygon-solid-only-hint"
        type="info"
        :closable="false"
        show-icon
        :title="t('elementSettings.concavePolygonSolidOnly')"
      />

      <el-form-item :label="t('elementSettings.backgroundColor')">
        <color-picker 
          v-model="currentModel.bgColor" 
          @change="handleBgColorChange" 
        />
      </el-form-item>

      <el-form-item :label="t('elementSettings.borderWidth')">
        <el-input-number 
          v-model="currentModel.borderWidth" 
          :min="0" 
          :max="10" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item :label="t('elementSettings.borderColor')">
        <color-picker 
          v-model="currentModel.borderColor" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item v-if="!isPolygonShape" :label="t('elementSettings.borderRadius')">
        <el-input-number 
          v-model="currentModel.borderRadius" 
          :min="0" 
          :max="25" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item :label="t('elementSettings.progress')">
        <el-slider 
          v-model="currentModel.progress" 
          :min="0" 
          :max="1" 
          :step="0.01" 
          @change="handleProgressChange" 
        />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch, watchEffect } from 'vue'
import * as elementManager from '@/engine/managers/elementManager'
import ColorPicker from '@/components/color-picker/index.vue'
import { ElMessage } from 'element-plus'
import GoalPropertyField from '@/elements/common/settings/GoalPropertyField.vue'
import { useI18n } from '@/i18n'
import type { FabricElement } from '@/types/element'
import {
  HORIZONTAL_GOAL_BAR_DIRECTIONS,
  VERTICAL_GOAL_BAR_DIRECTIONS,
  getGoalBarOrientationPatch,
  normalizeGoalBarDirection,
  resolveGoalBarOrientation,
  type GoalBarOrientation,
  type GoalBarProgressDirection,
} from './goalBar.direction'
import GoalBarPolygonMiniEditor from './GoalBarPolygonMiniEditor.vue'
import {
  isConvexPolygon,
  normalizeGoalBarPolygonConfig,
  validateGoalBarPolygon,
  type GoalBarPolygonPoint,
  type PolygonValidationReason,
} from './goalBar.geometry'
import { previewGoalBarPolygon, restoreGoalBarPreview } from './goalBar.renderer'
import {
  cloneGoalBarPolygonPoints,
  createGoalBarPolygonPanelSession,
  isGoalBarPolygonSessionElement,
  resolveGoalBarPolygonCommitPoints,
  resolveGoalBarPolygonPreviewState,
  updateGoalBarPolygonPanelState,
  type GoalBarPolygonMiniEditorState,
  type GoalBarPolygonPanelSession,
} from './goalBar.panelSession'

const emit = defineEmits(['close'])
const { t } = useI18n()

const props = defineProps<{
  element?: any
  config?: Record<string, any> | null
  applyPatch?: (patch: Record<string, any>) => Promise<void> | void
}>()

const formRef = ref<any>(null)
const segmentsLocal = ref(10)
const gapLocal = ref(2)
const pendingShape = ref<'customPolygon' | null>(null)
const editorSession = shallowRef<GoalBarPolygonPanelSession | null>(null)
const editorState = shallowRef<GoalBarPolygonMiniEditorState & { active: boolean; mode: 'create' | 'edit'; error?: string }>({
  active: false,
  mode: 'create',
  points: [],
  closed: false,
  pointCount: 0,
  valid: false,
})

const currentModel = computed<any>(() => {
  console.log('[GoalBarPanel] currentModel', props.config, props.element)
  return props.config ?? props.element ?? {}
})
const currentProgressDirection = computed(() => normalizeGoalBarDirection(currentModel.value.progressDirection))
const currentOrientation = computed<GoalBarOrientation>(() => resolveGoalBarOrientation(currentProgressDirection.value))
const availableProgressDirections = computed<readonly GoalBarProgressDirection[]>(() =>
  currentOrientation.value === 'vertical'
    ? VERTICAL_GOAL_BAR_DIRECTIONS
    : HORIZONTAL_GOAL_BAR_DIRECTIONS,
)
const progressDirectionIcons: Record<GoalBarProgressDirection, string> = {
  leftToRight: 'mdi:arrow-right',
  rightToLeft: 'mdi:arrow-left',
  bottomToTop: 'mdi:arrow-up',
  topToBottom: 'mdi:arrow-down',
}
const progressDirectionLabels: Record<GoalBarProgressDirection, string> = {
  leftToRight: 'Left to Right',
  rightToLeft: 'Right to Left',
  bottomToTop: 'Bottom to Top',
  topToBottom: 'Top to Bottom',
}

const isSegmentMode = computed(() => (currentModel.value as any)?.variant === 'segmented')
const persistedPolygonConfig = computed(() => {
  const model = currentModel.value as any
  return normalizeGoalBarPolygonConfig({
    shape: model?.shape,
    polygonPoints: model?.polygonPoints,
    slantRatio: model?.slantRatio,
  })
})
const persistedShape = computed(() => persistedPolygonConfig.value.shape)
const persistedPolygonPoints = computed<GoalBarPolygonPoint[]>(() =>
  persistedPolygonConfig.value.polygonPoints.map((point) => ({ ...point })),
)
const hasValidPersistedPolygon = computed(() => validateGoalBarPolygon(persistedPolygonPoints.value).valid)
const currentShape = computed(() => pendingShape.value ?? persistedShape.value)
const isPolygonShape = computed(() => currentShape.value === 'customPolygon')
const isPolygonConvex = computed(() => isPolygonShape.value && isConvexPolygon(persistedPolygonPoints.value))
const segmentPreviewCount = computed(() => Math.min(16, Math.max(1, segmentsLocal.value)))
const segmentPreviewActiveCount = computed(() => {
  const progress = Math.max(0, Math.min(1, Number((currentModel.value as any)?.progress ?? 0)))
  return Math.max(1, Math.round(segmentPreviewCount.value * progress))
})
const currentElementId = computed(() => {
  const id = (props.element as any)?.id ?? (props.config as any)?.id
  return id == null ? '' : String(id)
})
const polygonDoneDisabled = computed(
  () =>
    !editorState.value.active ||
    !editorState.value.valid ||
    (editorState.value.mode === 'create' && !editorState.value.closed),
)
const polygonEditorInstruction = computed(() => {
  const state = editorState.value
  if (state.mode === 'edit') return t('elementSettings.polygonEditHint')
  if (state.closed && state.valid) return t('elementSettings.polygonReady')
  if (state.pointCount >= 3) return t('elementSettings.polygonCloseHint')
  return t('elementSettings.polygonCreateHint')
})
const polygonValidationMessageKeys: Record<PolygonValidationReason, string> = {
  pointCount: 'elementSettings.polygonPointCountInvalid',
  range: 'elementSettings.polygonRangeInvalid',
  duplicate: 'elementSettings.polygonDuplicateInvalid',
  selfIntersection: 'elementSettings.polygonSelfIntersectionInvalid',
  concave: 'elementSettings.polygonMustStayConvex',
  area: 'elementSettings.polygonAreaInvalid',
}
const polygonEditorFeedback = computed(() => {
  const state = editorState.value
  if (state.error) return state.error
  if (state.reason) return t(polygonValidationMessageKeys[state.reason])
  if (state.mode === 'edit' && state.valid) return t('elementSettings.polygonReady')
  return ''
})
const polygonEditorFeedbackIsError = computed(
  () => Boolean(editorState.value.error || editorState.value.reason),
)

let nextEditorSessionKey = 0
let previewReplayScheduled = false

const resolveCurrentLiveElement = (): FabricElement | null =>
  (currentElementId.value ? elementManager.getElementById(currentElementId.value) : undefined) ??
  (props.element as FabricElement | undefined) ??
  null

watchEffect(() => {
  const model = currentModel.value as any
  segmentsLocal.value = Math.max(1, Math.floor(Number(model?.segments ?? 10)))
  gapLocal.value = Math.max(0, Number(model?.gap ?? 2))
  if (model) {
    model.originX = 'center'
    model.originY = 'center'
  }
})

const applyUpdate = async (patch: Record<string, any>) => {
  console.log('[GoalBarPanel] applyUpdate patch', patch, {
    hasConfig: !!props.config,
    hasApplyPatch: !!props.applyPatch,
    hasElement: !!props.element,
  })
  if (props.applyPatch) {
    await props.applyPatch(patch)
    return
  }

  if (props.element) {
    await elementManager.updateElement(props.element as any, patch)
  }
}

const handleMainColorChange = async (val: string) => {
  await applyUpdate({ color: val })
}

const handleGradientChange = async (value: { enabled: boolean; startColor: string; endColor: string }) => {
  Object.assign(currentModel.value as any, {
    gradientEnabled: value.enabled,
    gradientStartColor: value.startColor,
    gradientEndColor: value.endColor,
  })
  await applyUpdate({
    gradientEnabled: value.enabled,
    gradientStartColor: value.startColor,
    gradientEndColor: value.endColor,
  })
}

const handleBgColorChange = async (val: string) => {
  await applyUpdate({ bgColor: val })
}

const handleProgressChange = async (val: number) => {
  await applyUpdate({ progress: val })
}

const setProgressDirection = async (value: GoalBarProgressDirection) => {
  ;(currentModel.value as any).progressDirection = value
  await applyUpdate({ progressDirection: value })
}

const setOrientation = async (value: GoalBarOrientation) => {
  const model = currentModel.value as any
  const patch = getGoalBarOrientationPatch(
    currentOrientation.value,
    value,
    Number(model.width ?? 0),
    Number(model.height ?? 0),
  )
  if (!patch) return
  model.orientation = patch.orientation
  model.progressDirection = patch.progressDirection
  model.width = patch.width
  model.height = patch.height
  await applyUpdate(patch)
}

const clearPolygonEditor = () => {
  editorSession.value = null
  editorState.value = { ...editorState.value, active: false }
}

const cancelAndRestoreEditor = () => {
  const session = editorSession.value
  if (session) restoreGoalBarPreview(session.liveElement)
  clearPolygonEditor()
}

const startEditing = (mode: 'create' | 'edit') => {
  if (editorSession.value) cancelAndRestoreEditor()
  if (mode === 'create') pendingShape.value = 'customPolygon'
  const liveElement = resolveCurrentLiveElement()
  if (!liveElement) {
    pendingShape.value = null
    editorState.value = { ...editorState.value, active: false }
    ElMessage.error(t('elementSettings.polygonEditorUnavailable'))
    return
  }

  const polygonPoints = mode === 'create' ? [] : cloneGoalBarPolygonPoints(persistedPolygonPoints.value)
  if (mode === 'edit' && !validateGoalBarPolygon(polygonPoints).valid) {
    pendingShape.value = null
    editorState.value = { ...editorState.value, active: false }
    ElMessage.error(t('elementSettings.polygonEditorUnavailable'))
    return
  }

  const session = createGoalBarPolygonPanelSession(mode, polygonPoints, liveElement, ++nextEditorSessionKey)
  editorSession.value = session
  editorState.value = { ...session.state, active: true, mode }
}

const onPolygonEditorState = (state: GoalBarPolygonMiniEditorState) => {
  const session = editorSession.value
  if (!session) return
  updateGoalBarPolygonPanelState(session, state)
  editorState.value = { ...state, active: true, mode: session.mode, error: session.error }
}

const tryPreviewSessionPoints = (points: GoalBarPolygonPoint[]): boolean => {
  const session = editorSession.value
  if (!session || !validateGoalBarPolygon(points).valid || !session.state.closed) return false
  try {
    if (!previewGoalBarPolygon(session.liveElement, cloneGoalBarPolygonPoints(points))) {
      throw new Error('Goal bar polygon preview was rejected')
    }
    editorState.value = {
      ...resolveGoalBarPolygonPreviewState(session),
      active: true,
      mode: session.mode,
    }
    return true
  } catch (error) {
    console.error('[GoalBarPanel] polygon preview failed', error)
    try {
      restoreGoalBarPreview(session.liveElement)
    } catch (restoreError) {
      console.error('[GoalBarPanel] polygon preview restore failed', restoreError)
    }
    editorState.value = {
      ...resolveGoalBarPolygonPreviewState(
        session,
        t('elementSettings.polygonEditorUnavailable'),
      ),
      active: true,
      mode: session.mode,
    }
    return false
  }
}

const onPolygonPreview = (points: GoalBarPolygonPoint[]) => {
  tryPreviewSessionPoints(points)
}

const commitPolygonEditing = async (emittedValue?: unknown) => {
  const session = editorSession.value
  if (!session || session.saving) return
  const points = resolveGoalBarPolygonCommitPoints(session, emittedValue)
  if (!session.state.valid || !session.state.closed || !validateGoalBarPolygon(points).valid) return
  session.saving = true
  try {
    await applyUpdate({
      shape: 'customPolygon',
      polygonPoints: cloneGoalBarPolygonPoints(points),
      ...(isConvexPolygon(points) ? {} : { gradientEnabled: false }),
    })
    pendingShape.value = null
    clearPolygonEditor()
  } catch (error) {
    console.error('[GoalBarPanel] polygon save failed', error)
    session.saving = false
    session.error = t('elementSettings.polygonSaveFailed')
    editorState.value = { ...editorState.value, error: session.error }
    ElMessage.error(session.error)
  }
}

const cancelPolygonEditing = () => {
  cancelAndRestoreEditor()
  pendingShape.value = null
}

const onShapeChange = async (value: 'rectangle' | 'customPolygon') => {
  if (value === 'rectangle') {
    cancelAndRestoreEditor()
    pendingShape.value = null
    await applyUpdate({ shape: 'rectangle' })
    return
  }

  const polygonPoints = persistedPolygonPoints.value.map((point) => ({ ...point }))
  if (validateGoalBarPolygon(polygonPoints).valid) {
    await applyUpdate({
      shape: 'customPolygon',
      polygonPoints,
      ...(isConvexPolygon(polygonPoints) ? {} : { gradientEnabled: false }),
    })
    return
  }

  pendingShape.value = 'customPolygon'
  startEditing('create')
}

const onSegmentModeChange = async (val: string | number | boolean) => {
  const enabled = Boolean(val)
  const model = currentModel.value as any
  model.variant = enabled ? 'segmented' : 'continuous'
  if (enabled) {
    model.segments = segmentsLocal.value
    model.gap = gapLocal.value
  }
  await applyUpdate({
    variant: model.variant,
    segments: segmentsLocal.value,
    gap: gapLocal.value,
    padding: isPolygonShape.value ? model.padding : enabled ? 0 : model.padding,
  })
}

const onSegmentsChange = async (val: number | undefined) => {
  const n = Math.max(1, Math.floor(Number(val ?? 10)))
  segmentsLocal.value = n
  ;(currentModel.value as any).segments = n
  await applyUpdate({ variant: 'segmented', segments: n })
}

const onGapChange = async (val: number | undefined) => {
  const n = Math.max(0, Number(val ?? 0))
  gapLocal.value = n
  ;(currentModel.value as any).gap = n
  await applyUpdate({ variant: 'segmented', gap: n })
}

const updateElement = async () => {
  try {
    console.log('[GoalBarPanel] applying update without form validate')
    const model = currentModel.value as any
    console.log('[GoalBarPanel] model before patch', {
      progress: model.progress,
      borderRadius: model.borderRadius,
      variant: isSegmentMode.value ? 'segmented' : 'continuous',
      segments: Math.max(1, Math.floor(Number(model.segments ?? segmentsLocal.value))),
      gap: Math.max(0, Number(model.gap ?? gapLocal.value)),
      padding: model.padding,
      progressDirection: model.progressDirection,
      color: model.color,
      bgColor: model.bgColor,
      borderWidth: model.borderWidth,
      borderColor: model.borderColor,
      goalProperty: model.goalProperty,
      gradientEnabled: Boolean(model.gradientEnabled),
      gradientStartColor: model.gradientStartColor ?? model.color,
      gradientEndColor: model.gradientEndColor ?? model.color,
    })
    await applyUpdate({
      variant: model.variant ?? 'continuous',
      segments: model.segments,
      gap: model.gap,
      borderRadius: model.borderRadius,
      padding: model.padding,
      originX: 'center',
      originY: 'center',
      progressDirection: model.progressDirection,
      color: model.color,
      bgColor: model.bgColor,
      goalProperty: model.goalProperty,
      borderWidth: model.borderWidth,
      borderColor: model.borderColor,
    })
  } catch (error) {
    console.error('Form validation failed:', error)
  }
}

watch(
  () => [
    currentElementId.value,
    resolveCurrentLiveElement(),
    currentModel.value,
  ] as const,
  ([nextId, nextLiveElement]) => {
    const session = editorSession.value
    if (!session) return
    if (!isGoalBarPolygonSessionElement(session, nextId, nextLiveElement)) {
      cancelAndRestoreEditor()
      pendingShape.value = null
      return
    }

    if (session.saving || previewReplayScheduled || session.lastValidPoints.length === 0) return
    previewReplayScheduled = true
    void nextTick(() => {
      previewReplayScheduled = false
      const activeSession = editorSession.value
      if (
        activeSession !== session ||
        activeSession.saving ||
        !isGoalBarPolygonSessionElement(
          activeSession,
          currentElementId.value,
          resolveCurrentLiveElement(),
        )
      ) return
      tryPreviewSessionPoints(activeSession.lastValidPoints)
    })
  },
  { flush: 'sync' },
)

onBeforeUnmount(() => {
  cancelAndRestoreEditor()
  pendingShape.value = null
})

const handleClose = async () => {
  try {
    await formRef.value.validate()
    emit('close')
  } catch (error) {
    ElMessage.warning('Please complete the required fields first')
  }
}

// 暴露方法给父组件
defineExpose({
  formRef,
  handleClose
})
</script>

<style scoped>
.settings-section {
  padding: 16px;
}

.el-form-item {
  margin-bottom: 16px;
}

.polygon-editor-form-item :deep(.el-form-item__content) {
  width: 100%;
  min-width: 0;
  margin-left: 0 !important;
}

.polygon-editor-card {
  display: flex;
  width: 100%;
  min-width: 0;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--studio-primary-border);
  border-radius: 8px;
  background: color-mix(in srgb, var(--studio-primary) 5%, var(--studio-surface));
}

.polygon-editor-header,
.polygon-editor-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.polygon-editor-header strong {
  color: var(--studio-text);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.polygon-editor-mode {
  padding: 3px 7px;
  border-radius: 999px;
  background: var(--studio-primary-soft);
  color: var(--studio-primary);
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
  text-transform: uppercase;
}

.polygon-editor-instruction,
.polygon-editor-feedback {
  margin: 0;
  color: var(--studio-text-muted);
  font-size: 11px;
  line-height: 1.45;
}

.polygon-editor-feedback {
  color: var(--studio-primary);
  font-weight: 700;
}

.polygon-editor-feedback.is-error {
  color: var(--el-color-danger);
}

.polygon-editor-actions {
  justify-content: flex-end;
}

.edit-polygon-button {
  width: 100%;
}

.goal-bar-icon-options {
  display: flex;
  width: 100%;
  min-width: 0;
  gap: 0;
  padding: 3px;
  border: 1px solid var(--studio-border);
  border-radius: 8px;
  background: var(--studio-surface-soft);
}

.goal-bar-icon-option {
  display: inline-flex;
  flex: 1 1 0;
  height: 34px;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  background: transparent;
  color: var(--studio-text-muted);
  cursor: pointer;
  transition: background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
}

.goal-bar-icon-option:first-child {
  border-radius: 6px 0 0 6px;
}

.goal-bar-icon-option:last-child {
  border-radius: 0 6px 6px 0;
}

.goal-bar-icon-option + .goal-bar-icon-option {
  margin-left: -1px;
}

.goal-bar-icon-option:hover:not(:disabled) {
  position: relative;
  color: var(--studio-text);
  background: color-mix(in srgb, var(--studio-surface) 82%, transparent);
}

.goal-bar-icon-option.is-active {
  position: relative;
  border-color: var(--studio-primary-border);
  background: var(--studio-surface);
  color: var(--studio-primary);
  box-shadow: 0 1px 2px color-mix(in srgb, #000 10%, transparent);
}

.goal-bar-icon-option:focus-visible {
  z-index: 1;
  outline: 2px solid var(--studio-primary-border);
  outline-offset: 2px;
}

.goal-bar-icon-option:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.goal-bar-icon-option :deep(.iconify) {
  width: 20px;
  height: 20px;
}

.progress-bar-segment-panel {
  display: flex;
  width: 100%;
  min-width: 0;
  flex-direction: column;
  gap: 12px;
  padding: 10px;
  border: 1px solid var(--studio-border);
  border-radius: 8px;
  background: var(--studio-surface-soft);
  transition: border-color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease;
}

.progress-bar-segment-panel.is-active {
  border-color: var(--studio-primary-border);
  background: color-mix(in srgb, var(--studio-primary) 6%, var(--studio-surface));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--studio-primary) 10%, transparent);
}

.progress-bar-segment-header {
  display: flex;
  min-height: 34px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.progress-bar-segment-title {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.progress-bar-segment-title label {
  margin: 0;
  color: var(--studio-text);
  font-size: 13px;
  font-weight: 800;
  line-height: 1.2;
}

.progress-bar-segment-title span {
  flex: 0 0 auto;
  min-width: 30px;
  padding: 3px 7px;
  border: 1px solid var(--studio-border);
  border-radius: 999px;
  background: var(--studio-surface);
  color: var(--studio-text-muted);
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
  text-align: center;
  text-transform: uppercase;
}

.progress-bar-segment-panel.is-active .progress-bar-segment-title span {
  border-color: var(--studio-primary-border);
  background: color-mix(in srgb, var(--studio-primary) 12%, transparent);
  color: var(--studio-primary);
}

.progress-bar-segment-body {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 12px;
}

.progress-bar-segment-preview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(5px, 1fr));
  gap: 4px;
  align-items: center;
  height: 14px;
  padding: 4px;
  border: 1px solid color-mix(in srgb, var(--studio-border) 82%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--studio-surface) 78%, transparent);
}

.progress-bar-segment-preview span {
  height: 6px;
  min-width: 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--studio-text-muted) 22%, transparent);
}

.progress-bar-segment-preview span.active {
  background: var(--studio-primary);
}

.progress-bar-segment-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.progress-bar-setting-field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 6px;
}

.progress-bar-setting-field > label {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 0;
  color: var(--studio-text-muted);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.25;
}

.progress-bar-setting-field > label strong {
  flex: 0 0 auto;
  padding: 2px 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--studio-text-muted) 10%, transparent);
  color: var(--studio-text-muted);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  font-weight: 800;
  line-height: 1.2;
}

.progress-bar-segment-grid :deep(.el-input-number) {
  width: 100%;
}

/* Make ALL validation errors occupy normal flow so they push items below */
:deep(.el-form-item__error) {
  position: static;
  margin-top: 4px;
}

/* Ensure content area doesn't collapse when error appears */
:deep(.el-form-item__content) {
  padding-bottom: 0 !important;
}

/* Reduce line spacing for multi-line labels to the minimum reasonable */
:deep(.el-form-item__label) {
  line-height: 1.1; /* tighter line height for wrapped labels */
  padding-top: 0;   /* remove extra vertical padding */
  padding-bottom: 0;
}

/* When label is wrapped by helper container, ensure same effect */
:deep(.el-form-item__label-wrap .el-form-item__label) {
  line-height: 1.1;
  padding-top: 0;
  padding-bottom: 0;
}
</style>
