<template>
  <div class="settings-group">
    <h3>数据组设置</h3>
    <div class="setting-item" v-if="showDataProperty">
      <label>数据属性</label>
      <el-select 
        v-model="dataProperty" 
        @change="updateDataProperty"
        placeholder="选择数据属性"
      >
        <el-option 
          v-for="[key, prop] in Object.entries(propertiesStore.allProperties).filter(([_, p]) => p.type === 'data')" 
          :key="key" 
          :label="prop.title" 
          :value="key" 
        />
      </el-select>
    </div>
    <div class="setting-item" v-if="showGoalProperty">
      <label>目标属性</label>
      <el-select 
        v-model="goalProperty" 
        @change="updateGoalProperty"
        placeholder="选择目标属性"
      >
        <el-option 
          v-for="[key, prop] in Object.entries(propertiesStore.allProperties).filter(([_, p]) => p.type === 'goal')" 
          :key="key" 
          :label="prop.title" 
          :value="key" 
        />
      </el-select>
    </div>
    <div class="setting-item" v-if="isSameTypeLayer && !isTimeGroup">
      <label>对齐方式</label>
      <AlignXButtons 
        :options="originXOptions"
        v-model="originX"
        @update:modelValue="updateOriginX"
      />
    </div>
    <div class="setting-item" v-if="isSameTypeLayer">
      <label>字体大小</label>
      <select v-model.number="fontSize" @change="updateFontSize">
        <option v-for="size in fontSizes" :key="size" :value="size">{{ size }}px</option>
      </select>
    </div>
    <div class="setting-item" v-if="isUpdateColor">
      <label>字体颜色</label>
      <color-picker v-model="textColor" @change="updateTextColor" />
    </div>
    <div class="setting-item" v-if="isSameTypeLayer">
      <label>字体</label>
      <font-picker v-model="fontFamily" @change="updateFontFamily" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useBaseStore } from '@/stores/baseStore'
import { usePropertiesStore } from '@/stores/properties'
import { fontSizes, originXOptions } from '@/config/settings'
import ColorPicker from '@/components/color-picker/index.vue'
import FontPicker from '@/components/font-picker/font-picker.vue'
import AlignXButtons from '@/components/settings/common/AlignXButtons.vue'
import type { FabricElement } from '@/types/element'

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

const fontSize = ref(props.elements[0].fontSize || 36)
const textColor = ref(props.elements[0].fill || '#FFFFFF')
const fontFamily = ref<string>(props.elements[0].fontFamily || 'roboto-condensed-regular')
const originX = ref<string>(String(props.elements[0].originX || 'center'))

const dataProperty = ref<string>('')
const goalProperty = ref<string>('')

const updateDataProperty = () => {
  console.log('updateDataProperty', dataProperty.value, goalProperty.value)
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
      baseStore.canvas?.renderAll()
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

  // 获取组内所有元素的 goalProperty 值
  const goalProperties = props.elements.map(el => el.goalProperty)
  // 检查是否所有值都相同
  const allSameGoal = goalProperties.every(prop => prop === goalProperties[0])
  // 如果都相同则使用该值，否则使用空字符串
  goalProperty.value = allSameGoal ? goalProperties[0] || '' : ''
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
  console.log('hasOnlyValidTypes', hasOnlyValidTypes)
  // 并且同一种类型的元素最多只能有一个
  const hasOnlyOneOfType = props.elements.every(element => {  
    const count = props.elements.filter(e => e.eleType === element.eleType).length
    console.log('count', count, element.eleType)
    return count <= 1
  })
  
  // 当至少存在一个有效元素，且所有元素都是有效类型时显示
  const showDataProperty = (hasData || hasIcon || hasLabel) && hasOnlyValidTypes && hasOnlyOneOfType
  console.log('showDataProperty', showDataProperty , `hasData: ${hasData}, hasIcon: ${hasIcon}, hasLabel: ${hasLabel}, hasOnlyValidTypes: ${hasOnlyValidTypes}, hasOnlyOneOfType: ${hasOnlyOneOfType}`)
  return showDataProperty
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
  color: #555;
  margin-left: 1em; /* 使用制表符对齐 */
}

/* 添加图标样式 */
.align-buttons .iconify {
  font-size: 18px;
}
</style>
