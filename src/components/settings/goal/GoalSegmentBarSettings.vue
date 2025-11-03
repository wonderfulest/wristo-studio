<template>
  <div class="settings-section">
    <el-form ref="formRef" :model="element" label-position="left" label-width="120px">
      <el-form-item label="Goal Property" prop="goalProperty" :rules="[{ required: true, message: 'Please select a goal property', trigger: 'change' }]">
        <el-select
          v-model="element.goalProperty"
          placeholder="Select goal property"
          clearable
          filterable
          @change="updateElement"
        >
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

      <el-form-item label="Alignment">
        <AlignXButtons
          :options="originXOptions"
          v-model="originXModel"
          @update:modelValue="() => updateElement()"
        />
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
import AlignXButtons from '@/components/settings/common/AlignXButtons.vue'
import { originXOptions } from '@/config/settings'

const props = defineProps<{ element: FabricElement }>()
const emit = defineEmits<{ (e: 'update'): void }>()

const formRef = ref()
const store = useGoalSegmentBarStore()
const propertiesStore = usePropertiesStore()

const goalOptions = computed(() => Object.entries(propertiesStore.allProperties).filter(([_, p]) => p.type === 'goal'))

const originXModel = computed<string>({
  get: () => {
    const v = (props.element as any).originX
    return (v === 'left' || v === 'center' || v === 'right') ? v : 'center'
  },
  set: (val: string) => {
    ;(props.element as any).originX = val as any
  },
})

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

const handleActiveColorChange = (val: string) => {
  props.element.color = val
  void updateElement()
}

const handleBgColorChange = (val: string) => {
  props.element.bgColor = val
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
