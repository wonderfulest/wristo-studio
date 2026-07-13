<template>
  <el-sub-menu
    index="shape"
    popper-class="app-menu-dropdown app-menu-rich-dropdown app-menu-shape-dropdown"
    :popper-offset="8"
  >
    <template #title>
      <el-icon><Stamp /></el-icon>
      <span>{{ t('editor.shape') }}</span>
    </template>
    <div class="menu-group menu-group--shape">
      <div class="menu-group-title">
        <el-icon><Stamp /></el-icon>
        <span>{{ t('editor.shape') }}</span>
      </div>
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
        <el-icon><Crop /></el-icon>
        <span>{{ t('editor.rectangle') }}</span>
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
        <span>{{ t('editor.circle') }}</span>
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
        <span>{{ t('editor.line') }}</span>
      </el-menu-item>
      <el-menu-item
        index="basic/polygon"
        @click="onAddElement('shape', 'polygon', {
          fill: 'transparent',
          stroke: '#FFFFFF',
          strokeWidth: 2,
          width: 100,
          height: 100,
        })"
      >
        <el-icon><Crop /></el-icon>
        <span>{{ t('editor.polygon') }}</span>
      </el-menu-item>
      <el-menu-item index="basic/image" @click="onAddElement('image')">
        <el-icon><Picture /></el-icon>
        <span>{{ t('editor.image') }}</span>
      </el-menu-item>
    </div>
  </el-sub-menu>
</template>

<script setup>
import { Stamp, Minus, CircleCheck, Crop, Picture } from '@element-plus/icons-vue'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const emit = defineEmits(['add-element'])

const onAddElement = (category, elementType, overrides = {}) => {
  emit('add-element', category, elementType, overrides)
}
</script>
