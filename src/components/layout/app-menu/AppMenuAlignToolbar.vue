<template>
  <el-sub-menu index="align-toolbar">
    <template #title>
      <el-icon><Icon icon="mdi:align-horizontal-center" /></el-icon>
      <span>Align</span>
    </template>

    <el-menu-item index="align/left" @click="() => onAlign('left')">
      <el-icon><Icon icon="mdi:align-horizontal-left" /></el-icon>
      <span>Align Left</span>
    </el-menu-item>

    <el-menu-item index="align/center" @click="() => onAlign('center')">
      <el-icon><Icon icon="mdi:align-horizontal-center" /></el-icon>
      <span>Align Center</span>
    </el-menu-item>

    <el-menu-item index="align/right" @click="() => onAlign('right')">
      <el-icon><Icon icon="mdi:align-horizontal-right" /></el-icon>
      <span>Align Right</span>
    </el-menu-item>

    <el-menu-item index="align/top" @click="() => onAlign('top')">
      <el-icon><Icon icon="mdi:align-vertical-top" /></el-icon>
      <span>Align Top</span>
    </el-menu-item>

    <el-menu-item index="align/middle" @click="() => onAlign('middle')">
      <el-icon><Icon icon="mdi:align-vertical-center" /></el-icon>
      <span>Align Middle</span>
    </el-menu-item>

    <el-menu-item index="align/bottom" @click="() => onAlign('bottom')">
      <el-icon><Icon icon="mdi:align-vertical-bottom" /></el-icon>
      <span>Align Bottom</span>
    </el-menu-item>

    <el-menu-item index="distribute/horizontal" @click="() => onDistribute('horizontal')">
      <el-icon><Icon icon="mdi:align-horizontal-distribute" /></el-icon>
      <span>Distribute Horizontally</span>
    </el-menu-item>

    <el-menu-item index="distribute/vertical" @click="() => onDistribute('vertical')">
      <el-icon><Icon icon="mdi:align-vertical-distribute" /></el-icon>
      <span>Distribute Vertically</span>
    </el-menu-item>
  </el-sub-menu>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'

const props = defineProps<{
  onAlign: (type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void
  onDistribute: (axis: 'horizontal' | 'vertical') => void
}>()

const onAlign = (type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
  props.onAlign?.(type)
}

const onDistribute = (axis: 'horizontal' | 'vertical') => {
  props.onDistribute?.(axis)
}
</script>
