<template>
  <div class="settings-section">
    <el-form ref="formRef" :model="element" label-position="left" label-width="120px">
      <el-form-item label="Goal Property" prop="goalProperty" :rules="[{ required: true, message: 'Please select a goal property', trigger: 'change' }]">
        <el-select v-model="element.goalProperty" placeholder="Select goal property" @change="updateElement">
          <el-option
            v-for="[key, prop] in goalOptions"
            :key="key"
            :label="prop.title"
            :value="key"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="Width">
        <el-input-number v-model="element.designWidth" :min="50" :max="600" @change="updateElement" />
      </el-form-item>

      <el-form-item label="Height">
        <el-input-number v-model="element.designHeight" :min="4" :max="60" @change="updateElement" />
      </el-form-item>

      <el-form-item label="Segments">
        <el-input-number v-model="element.segments" :min="1" :max="50" :step="1" @change="updateElement" />
      </el-form-item>

      <el-form-item label="Gap">
        <el-input-number v-model="element.gap" :min="0" :max="20" :step="1" @change="updateElement" />
      </el-form-item>

      <el-form-item label="Border Radius">
        <el-input-number v-model="element.borderRadius" :min="0" :max="30" @change="updateElement" />
      </el-form-item>

      <el-form-item label="Progress">
        <el-slider v-model="element.progress" :min="0" :max="1" :step="0.01" @change="updateElement" />
      </el-form-item>

      <el-form-item label="Active Color">
        <color-picker v-model="element.color" @change="handleActiveColorChange" />
      </el-form-item>

      <el-form-item label="Background Color">
        <color-picker v-model="element.bgColor" @change="handleBgColorChange" />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import ColorPicker from '@/components/color-picker/index.vue'
import { useGoalSegmentBarStore } from '@/stores/elements/goal/goalSegmentBarElement'
import { usePropertiesStore } from '@/stores/properties'
import type { FabricElement } from '@/types/element'

const props = defineProps<{ element: FabricElement }>()
const emit = defineEmits<{ (e: 'update'): void }>()

const formRef = ref()
const store = useGoalSegmentBarStore()
const propertiesStore = usePropertiesStore()

const goalOptions = computed(() => Object.entries(propertiesStore.allProperties).filter(([_, p]) => p.type === 'goal'))

const updateElement = async () => {
  await formRef.value?.validate?.()
  store.updateElement(props.element, {
    width: (props.element as any).designWidth ?? props.element.width,
    height: (props.element as any).designHeight ?? props.element.height,
    borderRadius: props.element.borderRadius,
    segments: props.element.segments,
    gap: props.element.gap,
    progress: props.element.progress,
    color: props.element.color,
    bgColor: props.element.bgColor,
    originX: props.element.originX,
    originY: props.element.originY,
    goalProperty: props.element.goalProperty,
  })
  emit('update')
}

// 颜色互斥：前景与背景不能同时设置
const handleActiveColorChange = (val: string) => {
  // 当前设置前景色，置背景为透明
  props.element.color = val
  props.element.bgColor = 'transparent'
  // 更新
  void updateElement()
}

const handleBgColorChange = (val: string) => {
  // 当前设置背景色，置前景为透明
  props.element.bgColor = val
  props.element.color = 'transparent'
  // 更新
  void updateElement()
}
</script>

<style scoped>
.settings-section {
  padding: 16px;
}

.el-form-item {
  margin-bottom: 16px;
}
</style>
