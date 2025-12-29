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
import AlignXButtons from '@/settings/common/AlignXButtons.vue'
import DataPropertyField from '@/settings/common/DataPropertyField.vue'
import GoalPropertyField from '@/settings/common/GoalPropertyField.vue'
import type { FabricElement } from '@/types/element'
import { FontTypes } from '@/constants/fonts'

const baseStore = useBaseStore()
const propertiesStore = usePropertiesStore()

const props = defineProps<{
  elements: FabricElement[]
}>()

const getElementByType = (type: string): FabricElement | undefined => {
  return props.elements.find((obj) => obj.eleType === type)
}

// 设置项的响应式状态
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

// Element Plus form model to drive validation state
const formModel = reactive({
  dataProperty: '',
  goalProperty: '',
})

// Keep form model in sync with field
watch(dataProperty, (val) => {
  formModel.dataProperty = val
})

watch(goalProperty, (val) => {
  formModel.goalProperty = val
})


const updateDataProperty = () => {
  const prop = dataProperty.value || goalProperty.value
  if (!prop) return

  const metric = propertiesStore.getMetricByOptions({ dataProperty: dataProperty.value, goalProperty: goalProperty.value })
  if (dataProperty.value) {
    // 使用 nextTick 来避免同步更新导致的循环
    nextTick(() => {
      // 更新所有相关元素的数据属性
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
      // clear validation error once selected
      formRef.value?.clearValidate?.('dataProperty')
    })
  }
}

const updateGoalProperty = () => {
  if (!goalProperty.value) return

  const metric = propertiesStore.getMetricByOptions({ goalProperty: goalProperty.value, dataProperty: dataProperty.value })
  if (goalProperty.value) {
    // 使用 nextTick 来避免同步更新导致的循环
    nextTick(() => {
      // 更新所有相关元素的目标属性
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
      // clear validation error once selected
      formRef.value?.clearValidate?.('goalProperty')
    })
  }
}

// 初始化属性值
onMounted(() => {
  // 获取组内所有元素的 dataProperty 值
  const dataProperties = props.elements.map(el => el.dataProperty)
  // 检查是否所有值都相同
  const allSame = dataProperties.every(prop => prop === dataProperties[0])
  // 如果都相同则使用该值，否则使用空字符串
  dataProperty.value = allSame ? dataProperties[0] || '' : ''
  formModel.dataProperty = dataProperty.value

  // 获取组内所有元素的 goalProperty 值
  const goalProperties = props.elements.map(el => el.goalProperty)
  // 检查是否所有值都相同
  const allSameGoal = goalProperties.every(prop => prop === goalProperties[0])
  // 如果都相同则使用该值，否则使用空字符串
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

// 根据分组内元素类型，确定字体选择器的字体类型
const fontType = computed(() => {
  const eleType = props.elements[0]?.eleType
  switch (eleType) {
    case 'icon':
      return FontTypes.ICON_FONT
    case 'time':
      return FontTypes.NUMBER_FONT
    case 'data':
      return FontTypes.TEXT_FONT
    case 'label':
      return FontTypes.TEXT_FONT
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
  for (const element of props.elements) {
    element.set('originX', originXVal as 'left' | 'center' | 'right')
    element.setCoords()
  }
  originX.value = originXVal
  baseStore.canvas?.renderAll()
}

const showDataProperty = computed(() => {
  // 检查是否至少存在一个 data、icon 或 label 元素
  const hasData = dataElement.value !== undefined
  const hasIcon = iconElement.value !== undefined
  const hasLabel = labelElement.value !== undefined
  
  // 检查是否只包含这三种类型的元素
  const validTypes = ['data', 'icon', 'label']
  const hasOnlyValidTypes = props.elements.every(element => 
    element.eleType && validTypes.includes(element.eleType)
  )
  // 并且同一种类型的元素最多只能有一个
  const hasOnlyOneOfType = props.elements.every(element => {  
    const count = props.elements.filter(e => e.eleType === element.eleType).length
    console.log('count', count, element.eleType)
    return count <= 1
  })
  
  // 当至少存在一个有效元素，且所有元素都是有效类型时显示
  const showDataProperty = (hasData || hasIcon || hasLabel) && hasOnlyValidTypes && hasOnlyOneOfType
  return showDataProperty
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
  margin-left: 1em; /* 使用制表符对齐 */
}

/* 添加图标样式 */
.align-buttons .iconify {
  font-size: 18px;
}

.required {
  color: var(--el-color-danger);
  margin-left: 4px;
}
</style>
