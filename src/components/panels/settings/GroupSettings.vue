<template>
  <div class="settings-group">
    <h3>{{ t('elementSettings.dataGroupTitle') }}</h3>
    <el-form ref="formRef" :model="formModel" label-position="left" label-width="120px">
      <el-form-item :label="t('editor.align')">
        <div class="group-alignment-actions">
          <el-button
            v-for="option in groupAlignOptions"
            :key="option.type"
            circle
            class="group-alignment-button"
            :title="t(option.labelKey)"
            @click="handleGroupAlign(option.type)"
          >
            <Icon :icon="option.icon" width="17" height="17" />
          </el-button>
        </div>
      </el-form-item>

      <DataPropertyField
        v-if="showDataProperty"
        v-model="dataProperty"
        @change="updateDataProperty"
      />

      <GoalPropertyField
        v-if="showGoalProperty"
        v-model="goalProperty"
        @change="updateGoalProperty"
      />

      <el-form-item v-if="isSameTypeLayer && !isTimeGroup" :label="t('elementSettings.alignment')" required>
        <AlignXButtons
          :options="originXOptions"
          v-model="originX"
          @update:modelValue="updateOriginX"
        />
      </el-form-item>

      <el-form-item v-if="isSameTypeLayer" :label="t('elementSettings.fontSize')" required>
        <FontSizeSelect v-model="fontSize" @change="updateFontSize" />
      </el-form-item>

      <el-form-item v-if="isUpdateColor" :label="t('elementSettings.textColor')" required>
        <color-picker v-model="textColor" @change="updateTextColor" />
      </el-form-item>

      <el-form-item v-if="isSameTypeLayer" :label="t('elementSettings.font')" required>
        <font-picker
          v-model="fontFamily"
          :type="fontType"
          :date-content-language="metricTextFontLanguage"
          @change="updateFontFamily"
        />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed, onMounted, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
import type { FormInstance } from 'element-plus'
import { useBaseStore } from '@/stores/baseStore'
import { usePropertiesStore } from '@/stores/properties'
import { useDesignStore } from '@/stores/designStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import { useHistoryStore } from '@/stores/historyStore'
import { useAmoledIconAssetStore } from '@/stores/amoledIconAssetStore'
import { originXOptions } from '@/config/settings'
import ColorPicker from '@/components/color-picker/index.vue'
import FontPicker from '@/components/font-picker/font-picker.vue'
import AlignXButtons from '@/elements/common/settings/AlignXButtons.vue'
import DataPropertyField from '@/elements/common/settings/DataPropertyField.vue'
import GoalPropertyField from '@/elements/common/settings/GoalPropertyField.vue'
import FontSizeSelect from '@/elements/common/settings/FontSizeSelect.vue'
import type { FabricElement } from '@/types/element'
import { FontTypes } from '@/config/fonts'
import { alignSelection, type AlignType } from '@/engine/managers/alignManager'
import * as elementManager from '@/engine/managers/elementManager'
import { useI18n } from '@/i18n'
import { resolveMetricLabel, resolveMetricUnit } from '@/utils/metricLabel'
import type { DateContentLanguage } from '@/utils/dateFontCompatibility'
import { resolveIconGlyphText } from '@/utils/iconGlyph'
import { normalizeIconUnicode } from '@/types/amoledIcons'

const baseStore = useBaseStore()
const { t } = useI18n()
const propertiesStore = usePropertiesStore()
const designStore = useDesignStore()
const elementDataStore = useElementDataStore()
const historyStore = useHistoryStore()
const amoledIconAssetStore = useAmoledIconAssetStore()

const props = defineProps<{
  elements: FabricElement[]
}>()

const groupAlignOptions: Array<{ type: AlignType; icon: string; labelKey: string }> = [
  { type: 'left', icon: 'mdi:align-horizontal-left', labelKey: 'editor.alignLeft' },
  { type: 'center', icon: 'mdi:align-horizontal-center', labelKey: 'editor.alignCenter' },
  { type: 'right', icon: 'mdi:align-horizontal-right', labelKey: 'editor.alignRight' },
  { type: 'top', icon: 'mdi:align-vertical-top', labelKey: 'editor.alignTop' },
  { type: 'middle', icon: 'mdi:align-vertical-center', labelKey: 'editor.alignMiddle' },
  { type: 'bottom', icon: 'mdi:align-vertical-bottom', labelKey: 'editor.alignBottom' },
]

const handleGroupAlign = (type: AlignType) => {
  if (props.elements.length <= 1) return
  alignSelection(type)
}

const getElementByType = (type: string): FabricElement | undefined => {
  return props.elements.find((obj) => obj.eleType === type)
}

const iconElement = computed(() => getElementByType('icon'))
const dataElement = computed(() => getElementByType('data'))
const labelElement = computed(() => getElementByType('label'))
const unitElement = computed(() => getElementByType('unit'))
const goalBarElement = computed(() => getElementByType('goalBar'))
const goalArcElement = computed(() => getElementByType('goalArc'))

const fontSize = ref(props.elements[0].fontSize || 36)
const textColor = ref(props.elements[0].fill || '#FFFFFF')
const fontFamily = ref<string>(props.elements[0].fontFamily || 'roboto-condensed-regular')
const originX = ref<string>(String(props.elements[0].originX || 'center'))

const dataProperty = ref<string>('')
const goalProperty = ref<string>('')
const formRef = ref<FormInstance>()

const formModel = reactive({
  dataProperty: '',
  goalProperty: '',
})

const commitHistory = (reason: string) => {
  historyStore.saveState(`group:${reason}`)
}

const buildIconMetricPatch = (element: FabricElement, metric: any, propertyPatch: Record<string, any>) => {
  const iconUnicode = normalizeIconUnicode(metric?.iconUnicode || metric?.icon)
  const fontSlug = String((element as any).fontFamily || (element as any).iconFont || '').trim()
  const amoledImageUrl = iconUnicode ? amoledIconAssetStore.getDisplayUrl(fontSlug, iconUnicode) : ''
  const keepAmoled = String((element as any).iconDisplayType || 'mip') === 'amoled' && Boolean(amoledImageUrl)
  const size = Number((element as any).iconSize || (element as any).fontSize || 30)

  return {
    ...propertyPatch,
    metricSymbol: metric?.metricSymbol,
    text: resolveIconGlyphText(iconUnicode),
    iconDisplayType: keepAmoled ? 'amoled' : 'mip',
    amoledImageUrl: keepAmoled ? amoledImageUrl : null,
    amoledIconUnicode: iconUnicode || null,
    width: keepAmoled ? size : undefined,
    height: keepAmoled ? size : undefined,
  }
}

watch(dataProperty, (val) => {
  formModel.dataProperty = val
})

watch(goalProperty, (val) => {
  formModel.goalProperty = val
})

const updateDataProperty = () => {
  const prop = dataProperty.value || goalProperty.value
  if (!prop) return

  const metric = propertiesStore.getMetricByOptions({
    dataProperty: dataProperty.value,
    goalProperty: goalProperty.value,
  })
  if (dataProperty.value) {
    nextTick(async () => {
      if (dataElement.value) {
        dataElement.value.set('dataProperty', dataProperty.value)
        dataElement.value.set('goalProperty', null)
        dataElement.value.set('text', metric.defaultValue)
        const dataId = String((dataElement.value as any).id)
        if (dataId) elementDataStore.patchElement(dataId, { dataProperty: dataProperty.value, goalProperty: null, text: metric.defaultValue } as any)
      }
      if (iconElement.value) {
        const iconId = String((iconElement.value as any).id)
        if (iconId) {
          await elementManager.updateElementById(
            iconId,
            buildIconMetricPatch(iconElement.value, metric, { dataProperty: dataProperty.value, goalProperty: null })
          )
        }
      }
      if (labelElement.value) {
        const labelText = resolveMetricLabel(metric, designStore.supportsChineseContent ? 'zh' : 'en')
        labelElement.value.set('dataProperty', dataProperty.value)
        labelElement.value.set('goalProperty', null)
        labelElement.value.set('text', labelText)
        const labelId = String((labelElement.value as any).id)
        if (labelId) elementDataStore.patchElement(labelId, { dataProperty: dataProperty.value, goalProperty: null, text: labelText } as any)
      }
      if (unitElement.value) {
        const unitText = resolveMetricUnit(metric, designStore.supportsChineseContent ? 'zh' : 'en')
        unitElement.value.set('dataProperty', dataProperty.value)
        unitElement.value.set('goalProperty', null)
        unitElement.value.set('text', unitText)
        ;(unitElement.value as any).metricValue = unitText
        const unitId = String((unitElement.value as any).id)
        if (unitId) elementDataStore.patchElement(unitId, { dataProperty: dataProperty.value, goalProperty: null, text: unitText, metricValue: unitText } as any)
      }
      baseStore.canvas?.renderAll()
      formRef.value?.clearValidate?.('dataProperty')
      commitHistory('data-property')
    })
  }
}

const updateGoalProperty = () => {
  if (!goalProperty.value) return

  const metric = propertiesStore.getMetricByOptions({
    goalProperty: goalProperty.value,
    dataProperty: dataProperty.value,
  })
  if (goalProperty.value) {
    nextTick(async () => {
      if (dataElement.value) {
        dataElement.value.set('goalProperty', goalProperty.value)
        dataElement.value.set('dataProperty', null)
        dataElement.value.set('text', metric.defaultValue)
        const dataId = String((dataElement.value as any).id)
        if (dataId) elementDataStore.patchElement(dataId, { goalProperty: goalProperty.value, dataProperty: null, text: metric.defaultValue } as any)
      }
      if (iconElement.value) {
        const iconId = String((iconElement.value as any).id)
        if (iconId) {
          await elementManager.updateElementById(
            iconId,
            buildIconMetricPatch(iconElement.value, metric, { goalProperty: goalProperty.value, dataProperty: null })
          )
        }
      }
      if (labelElement.value) {
        const labelText = resolveMetricLabel(metric, designStore.supportsChineseContent ? 'zh' : 'en')
        labelElement.value.set('goalProperty', goalProperty.value)
        labelElement.value.set('dataProperty', null)
        labelElement.value.set('text', labelText)
        const labelId = String((labelElement.value as any).id)
        if (labelId) elementDataStore.patchElement(labelId, { goalProperty: goalProperty.value, dataProperty: null, text: labelText } as any)
      }
      if (unitElement.value) {
        const unitText = resolveMetricUnit(metric, designStore.supportsChineseContent ? 'zh' : 'en')
        unitElement.value.set('goalProperty', goalProperty.value)
        unitElement.value.set('dataProperty', null)
        unitElement.value.set('text', unitText)
        ;(unitElement.value as any).metricValue = unitText
        const unitId = String((unitElement.value as any).id)
        if (unitId) elementDataStore.patchElement(unitId, { goalProperty: goalProperty.value, dataProperty: null, text: unitText, metricValue: unitText } as any)
      }
      if (goalBarElement.value) {
        const goalBarId = String((goalBarElement.value as any).id)
        if (goalBarId) await elementManager.updateElementById(goalBarId, { goalProperty: goalProperty.value } as any)
      }
      if (goalArcElement.value) {
        const goalArcId = String((goalArcElement.value as any).id)
        if (goalArcId) await elementManager.updateElementById(goalArcId, { goalProperty: goalProperty.value } as any)
      }
      baseStore.canvas?.renderAll()
      formRef.value?.clearValidate?.('goalProperty')
      commitHistory('goal-property')
    })
  }
}

onMounted(() => {
  const dataProperties = props.elements.map((el) => el.dataProperty)
  const allSame = dataProperties.every((prop) => prop === dataProperties[0])
  dataProperty.value = allSame ? dataProperties[0] || '' : ''
  formModel.dataProperty = dataProperty.value

  const goalProperties = props.elements.map((el) => el.goalProperty)
  const allSameGoal = goalProperties.every((prop) => prop === goalProperties[0])
  goalProperty.value = allSameGoal ? goalProperties[0] || '' : ''
  formModel.goalProperty = goalProperty.value
})

const isUpdateColor = computed(() => {
  const eleType = props.elements[0]?.eleType
  if (!eleType || !['time', 'date', 'icon', 'data', 'unit', 'bluetooth', 'disturb'].includes(eleType)) {
    return false
  }
  return true
})

const isTimeGroup = computed(() => {
  return props.elements.every((element) => element.eleType === 'time')
})

const isSameTypeLayer = computed(() => {
  if (props.elements.length <= 1) {
    return true
  }
  const firstType = props.elements[0]?.eleType
  if (!firstType) return false
  return props.elements.every((element) => element.eleType === firstType)
})

const fontType = computed(() => {
  const eleType = props.elements[0]?.eleType
  switch (eleType) {
    case 'icon':
      return FontTypes.ICON_FONT
    case 'time':
    case 'data':
    case 'unit':
    case 'label':
    case 'date':
      return FontTypes.TEXT_FONT
    default:
      return FontTypes.TEXT_FONT
  }
})

const metricTextFontLanguage = computed<DateContentLanguage | undefined>(() => {
  const eleType = props.elements[0]?.eleType
  if (!designStore.supportsChineseContent || !['label', 'unit'].includes(String(eleType ?? ''))) {
    return undefined
  }
  return 'zh'
})

const updateFontSize = () => {
  for (const element of props.elements) {
    element.set('fontSize', fontSize.value)
    if ((element as any).id) {
      elementDataStore.patchElement(String((element as any).id), { fontSize: fontSize.value } as any)
    }
  }
  baseStore.canvas?.renderAll()
  commitHistory('font-size')
}

const updateTextColor = () => {
  for (const element of props.elements) {
    element.set('fill', textColor.value)
    if ((element as any).id) {
      elementDataStore.patchElement(String((element as any).id), { fill: textColor.value } as any)
    }
  }
  baseStore.canvas?.renderAll()
  commitHistory('text-color')
}

const updateFontFamily = () => {
  for (const element of props.elements) {
    element.set('fontFamily', fontFamily.value)
    if ((element as any).id) {
      elementDataStore.patchElement(String((element as any).id), { fontFamily: fontFamily.value } as any)
    }
  }
  baseStore.canvas?.renderAll()
  commitHistory('font-family')
}

const updateOriginX = (originXVal: string) => {
  switch (originXVal) {
    case 'left':
      alignSelection('left')
      break
    case 'center':
      alignSelection('center')
      break
    case 'right':
      alignSelection('right')
      break
    default:
      break
  }
  originX.value = originXVal
}

const showDataProperty = computed(() => {
  const hasData = dataElement.value !== undefined
  const hasIcon = iconElement.value !== undefined
  const hasLabel = labelElement.value !== undefined
  const hasUnit = unitElement.value !== undefined

  const validTypes = ['data', 'icon', 'label', 'unit']
  const hasOnlyValidTypes = props.elements.every(
    (element) => element.eleType && validTypes.includes(element.eleType),
  )

  const hasOnlyOneOfType = props.elements.every((element) => {
    const count = props.elements.filter((e) => e.eleType === element.eleType).length
    return count <= 1
  })

  const show = (hasData || hasIcon || hasLabel || hasUnit) && hasOnlyValidTypes && hasOnlyOneOfType
  return show
})

const showGoalProperty = computed(() => {
  const hasGoalBar = goalBarElement.value !== undefined
  const hasGoalArc = goalArcElement.value !== undefined
  return hasGoalBar || hasGoalArc
})
</script>

<style scoped>
@import '@/assets/styles/settings.css';
.example-text {
  color: var(--studio-text-muted);
  margin-left: 1em;
}

.align-buttons .iconify {
  font-size: 18px;
}

.required {
  color: var(--el-color-danger);
  margin-left: 4px;
}

.group-alignment-actions {
  display: grid;
  grid-template-columns: repeat(6, 28px);
  gap: 4px;
}

.group-alignment-button {
  width: 28px;
  height: 28px;
  margin: 0;
  padding: 0;
}
</style>
