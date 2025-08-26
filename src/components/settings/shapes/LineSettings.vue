<template>
  <div class="line-settings">
    <!-- 基础设置 -->
    <BaseSettings :element="element" @update="handleUpdate" />

    <!-- 直线样式设置 -->
    <el-divider>直线样式</el-divider>
    
    <div class="setting-group">
      <label>线条颜色</label>
      <color-picker 
        :modelValue="element.stroke" 
        @update:modelValue="value => handleUpdate('stroke', value)"
        show-alpha
      />
    </div>

    <div class="setting-group">
      <label>线条宽度</label>
      <el-input-number 
        :modelValue="element.strokeWidth" 
        @update:modelValue="value => handleUpdate('strokeWidth', value)"
        :min="1" 
        :max="20" 
        :step="1"
        controls-position="right"
      />
    </div>

    <div class="setting-group">
      <label>线条透明度</label>
      <el-slider 
        :modelValue="element.opacity" 
        @update:modelValue="value => handleUpdate('opacity', value)"
        :min="0" 
        :max="1" 
        :step="0.1"
      />
    </div>

    <!-- 线条端点样式 -->
    <el-divider>端点样式</el-divider>
    
    <div class="setting-group">
      <label>线条端点</label>
      <el-select 
        :modelValue="element.strokeLineCap" 
        @update:modelValue="value => handleUpdate('strokeLineCap', value)"
        placeholder="选择端点样式"
      >
        <el-option label="平头" value="butt" />
        <el-option label="圆头" value="round" />
        <el-option label="方头" value="square" />
      </el-select>
    </div>

    <div class="setting-group">
      <label>线条连接</label>
      <el-select 
        :modelValue="element.strokeLineJoin" 
        @update:modelValue="value => handleUpdate('strokeLineJoin', value)"
        placeholder="选择连接样式"
      >
        <el-option label="斜接" value="miter" />
        <el-option label="圆角" value="round" />
        <el-option label="斜角" value="bevel" />
      </el-select>
    </div>

    <!-- 高级设置 -->
    <el-divider>高级设置</el-divider>
    
    <div class="setting-group">
      <label>起始点 X</label>
      <el-input-number 
        :modelValue="element.x1" 
        @update:modelValue="value => handleUpdate('x1', value)"
        :step="1"
        controls-position="right"
      />
    </div>

    <div class="setting-group">
      <label>起始点 Y</label>
      <el-input-number 
        :modelValue="element.y1" 
        @update:modelValue="value => handleUpdate('y1', value)"
        :step="1"
        controls-position="right"
      />
    </div>

    <div class="setting-group">
      <label>结束点 X</label>
      <el-input-number 
        :modelValue="element.x2" 
        @update:modelValue="value => handleUpdate('x2', value)"
        :step="1"
        controls-position="right"
      />
    </div>

    <div class="setting-group">
      <label>结束点 Y</label>
      <el-input-number 
        :modelValue="element.y2" 
        @update:modelValue="value => handleUpdate('y2', value)"
        :step="1"
        controls-position="right"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import BaseSettings from '@/components/settings/BaseSettings.vue'
import ColorPicker from '@/components/color-picker/index.vue'

const props = defineProps({
  element: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update'])

// 计算当前元素
const currentElement = computed(() => props.element)

// 处理属性更新
const handleUpdate = (property, value) => {
  emit('update', { [property]: value })
}
</script>

<style scoped>
.line-settings {
  padding: 16px;
}

.setting-group {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.setting-group label {
  font-size: 14px;
  color: #606266;
  margin-right: 12px;
  white-space: nowrap;
}

.setting-group :deep(.el-input-number),
.setting-group :deep(.el-select) {
  width: 120px;
}

.setting-group :deep(.el-slider) {
  width: 120px;
}

:deep(.el-divider__text) {
  font-size: 14px;
  font-weight: 500;
}
</style>