<template>
  <el-sub-menu index="shape">
    <template #title>
      <el-icon><Stamp /></el-icon>
      <span>Shape</span>
    </template>
    <div class="menu-group">
      <el-menu-item
        index="basic/rectangle"
        @click="onAddElement('shape', 'rectangle', {
          fill: 'transparent',
          stroke: '#FFFFFF',
          strokeWidth: 2,
          borderRadius: 5,
          width: 100,
          height: 50,
        })"
      >
        <el-icon><Minus /></el-icon>
        <span>Rectangle</span>
      </el-menu-item>
      <el-menu-item
        index="basic/circle"
        @click="onAddElement('shape', 'circle', {
          fill: 'transparent',
          stroke: '#FFFFFF',
          strokeWidth: 2,
          radius: 50,
        })"
      >
        <el-icon><CircleCheck /></el-icon>
        <span>Circle</span>
      </el-menu-item>
      <el-menu-item
        index="basic/line"
        @click="onAddElement('shape', 'line', {
          // center at (227, 227), length 300 => x1=77, x2=377
          x1: 77,
          y1: 227,
          x2: 377,
          y2: 227,
        })"
      >
        <el-icon><Minus /></el-icon>
        <span>Line</span>
      </el-menu-item>
      <el-menu-item index="basic/image" @click="onAddElement('image')">
        <el-icon><Picture /></el-icon>
        <span>Image</span>
      </el-menu-item>
    </div>
  </el-sub-menu>
</template>

<script setup>
import { Stamp, Minus, CircleCheck, Edit, Calendar, Picture } from '@element-plus/icons-vue'

const emit = defineEmits(['add-element'])

const onAddElement = (category, elementType, overrides = {}) => {
  emit('add-element', category, elementType, overrides)
}
</script>
