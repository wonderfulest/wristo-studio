<template>
  <div class="settings-section">
    <el-form ref="formRef" :model="element" label-position="left" label-width="120px">
      <GoalPropertyField
        v-model="element.goalProperty"
        @change="updateElement"
      />

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

      <!-- <el-form-item label="Alignment">
        <AlignXButtons
          :options="originXOptions"
          v-model="originXModel"
          @update:modelValue="() => updateElement()"
        />
      </el-form-item> -->

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
import ColorPicker from '@/components/color-picker/index.vue'
import { useGoalSegmentBarStore } from '@/elements/goal/goalSegmentBar/goalSegmentBarElement'
import type { FabricElement } from '@/types/element'
import GoalPropertyField from '@/elements/common/settings/GoalPropertyField.vue'

const props = defineProps<{ element: FabricElement }>()
const emit = defineEmits<{ (e: 'update'): void }>()

const store = useGoalSegmentBarStore()
 
const updateElement = async () => {
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
