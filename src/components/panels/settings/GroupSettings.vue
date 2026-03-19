<template>
  <div class="settings-group">
    <h3>Data Group Settings</h3>
    <el-form ref="formRef" :model="formModel" label-position="left" label-width="120px">
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

      <el-form-item v-if="isSameTypeLayer && !isTimeGroup" label="Alignment" required>
        <AlignXButtons
          :options="originXOptions"
          v-model="originX"
          @update:modelValue="updateOriginX"
        />
      </el-form-item>

      <el-form-item v-if="isSameTypeLayer" label="Font Size" required>
        <el-select v-model.number="fontSize" @change="updateFontSize">
          <el-option v-for="size in fontSizes" :key="size" :label="`${size}px`" :value="size" />
        </el-select>
      </el-form-item>

      <el-form-item v-if="isUpdateColor" label="Text Color" required>
        <color-picker v-model="textColor" @change="updateTextColor" />
      </el-form-item>

      <el-form-item v-if="isSameTypeLayer" label="Font" required>
        <font-picker v-model="fontFamily" :type="fontType" @change="updateFontFamily" />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed, onMounted, nextTick } from 'vue'
import type { FormInstance } from 'element-plus'
import { useBaseStore } from '@/stores/baseStore'
import { usePropertiesStore } from '@/stores/properties'
import { fontSizes, originXOptions } from '@/config/settings'
import ColorPicker from '@/components/color-picker/index.vue'
import FontPicker from '@/components/font-picker/font-picker.vue'
import AlignXButtons from '@/elements/common/settings/AlignXButtons.vue'
import DataPropertyField from '@/elements/common/settings/DataPropertyField.vue'
import GoalPropertyField from '@/elements/common/settings/GoalPropertyField.vue'
import type { FabricElement } from '@/types/element'
import { FontTypes } from '@/config/fonts'
import { alignSelection } from '@/engine/managers/alignManager'

const baseStore = useBaseStore()
const propertiesStore = usePropertiesStore()

const props = defineProps<{
  elements: FabricElement[]
}>()

const getElementByType = (type: string): FabricElement | undefined => {
  return props.elements.find((obj) => obj.eleType === type)
}

const iconElement = computed(() => getElementByType('icon'))
const dataElement = computed(() => getElementByType('data'))
const labelElement = computed(() => getElementByType('label'))
const goalBarElement = computed(() => getElementByType('goalBar'))
const goalArcElement = computed(() => getElementByType('goalArc'))
const goalSegmentBarElement = computed(() => getElementByType('goalSegmentBar'))

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
    nextTick(() => {
      if (dataElement.value) {
        dataElement.value.set('dataProperty', dataProperty.value)
        dataElement.value.set('goalProperty', null)
        dataElement.value.set('text', metric.defaultValue)
      }
      if (iconElement.value) {
        iconElement.value.set('dataProperty', dataProperty.value)
        iconElement.value.set('goalProperty', null)
        iconElement.value.set('text', metric.icon)
      }
      if (labelElement.value) {
        labelElement.value.set('dataProperty', dataProperty.value)
        labelElement.value.set('goalProperty', null)
        labelElement.value.set('text', metric.enLabel.short)
      }
      baseStore.canvas?.renderAll()
      formRef.value?.clearValidate?.('dataProperty')
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
    nextTick(() => {
      if (dataElement.value) {
        dataElement.value.set('goalProperty', goalProperty.value)
        dataElement.value.set('dataProperty', null)
        dataElement.value.set('text', metric.defaultValue)
      }
      if (iconElement.value) {
        iconElement.value.set('goalProperty', goalProperty.value)
        iconElement.value.set('dataProperty', null)
        iconElement.value.set('text', metric.icon)
      }
      if (labelElement.value) {
        labelElement.value.set('goalProperty', goalProperty.value)
        labelElement.value.set('dataProperty', null)
        labelElement.value.set('text', metric.enLabel.short)
      }
      if (goalBarElement.value) {
        goalBarElement.value.set('goalProperty', goalProperty.value)
      }
      if (goalArcElement.value) {
        goalArcElement.value.set('goalProperty', goalProperty.value)
      }
      if (goalSegmentBarElement.value) {
        goalSegmentBarElement.value.set('goalProperty', goalProperty.value)
      }
      baseStore.canvas?.renderAll()
      formRef.value?.clearValidate?.('goalProperty')
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
  if (!eleType || !['time', 'date', 'icon', 'data', 'bluetooth', 'disturb'].includes(eleType)) {
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
    case 'label':
    case 'date':
      return FontTypes.TEXT_FONT
    default:
      return FontTypes.TEXT_FONT
  }
})

const updateFontSize = () => {
  for (const element of props.elements) {
    element.set('fontSize', fontSize.value)
  }
  baseStore.canvas?.renderAll()
}

const updateTextColor = () => {
  for (const element of props.elements) {
    element.set('fill', textColor.value)
  }
  baseStore.canvas?.renderAll()
}

const updateFontFamily = () => {
  for (const element of props.elements) {
    element.set('fontFamily', fontFamily.value)
  }
  baseStore.canvas?.renderAll()
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

  const validTypes = ['data', 'icon', 'label']
  const hasOnlyValidTypes = props.elements.every(
    (element) => element.eleType && validTypes.includes(element.eleType),
  )

  const hasOnlyOneOfType = props.elements.every((element) => {
    const count = props.elements.filter((e) => e.eleType === element.eleType).length
    return count <= 1
  })

  const show = (hasData || hasIcon || hasLabel) && hasOnlyValidTypes && hasOnlyOneOfType
  return show
})

const showGoalProperty = computed(() => {
  const hasGoalBar = goalBarElement.value !== undefined
  const hasGoalArc = goalArcElement.value !== undefined
  const hasGoalSegmentBar = goalSegmentBarElement.value !== undefined
  return hasGoalBar || hasGoalArc || hasGoalSegmentBar
})
</script>

<style scoped>
@import '@/assets/styles/settings.css';
.example-text {
  color: #555;
  margin-left: 1em;
}

.align-buttons .iconify {
  font-size: 18px;
}

.required {
  color: var(--el-color-danger);
  margin-left: 4px;
}
</style>
