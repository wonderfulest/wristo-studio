<template>
  <el-sub-menu index="align-toolbar">
    <template #title>
      <Icon name="mdi:align-horizontal-center" />
      <span>Align</span>
    </template>

    <el-menu-item index="align/left" @click="() => onAlign('left')">
      <Icon name="mdi:align-horizontal-left" />
      <span>Align Left</span>
    </el-menu-item>

    <el-menu-item index="align/center" @click="() => onAlign('center')">
      <Icon name="mdi:align-horizontal-center" />
      <span>Align Center</span>
    </el-menu-item>

    <el-menu-item index="align/right" @click="() => onAlign('right')">
      <Icon name="mdi:align-horizontal-right" />
      <span>Align Right</span>
    </el-menu-item>

    <el-menu-item index="align/top" @click="() => onAlign('top')">
      <Icon name="mdi:align-vertical-top" />
      <span>Align Top</span>
    </el-menu-item>

    <el-menu-item index="align/middle" @click="() => onAlign('middle')">
      <Icon name="mdi:align-vertical-center" />
      <span>Align Middle</span>
    </el-menu-item>

    <el-menu-item index="align/bottom" @click="() => onAlign('bottom')">
      <Icon name="mdi:align-vertical-bottom" />
      <span>Align Bottom</span>
    </el-menu-item>

    <el-menu-item index="distribute/horizontal" @click="() => onDistribute('horizontal')">
      <Icon name="mdi:align-horizontal-distribute" />
      <span>Distribute Horizontally</span>
    </el-menu-item>

    <el-menu-item index="distribute/vertical" @click="() => onDistribute('vertical')">
      <Icon name="mdi:align-vertical-distribute" />
      <span>Distribute Vertically</span>
    </el-menu-item>
  </el-sub-menu>
</template>

<script setup lang="ts">
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
