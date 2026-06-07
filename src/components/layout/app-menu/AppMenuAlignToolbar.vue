<template>
  <el-sub-menu index="align-toolbar">
    <template #title>
      <el-icon><Icon icon="mdi:align-horizontal-center" /></el-icon>
      <span>{{ t('editor.align') }}</span>
    </template>

    <el-menu-item index="align/left" @click="() => onAlign('left')">
      <el-icon><Icon icon="mdi:align-horizontal-left" /></el-icon>
      <span>{{ t('editor.alignLeft') }}</span>
    </el-menu-item>

    <el-menu-item index="align/center" @click="() => onAlign('center')">
      <el-icon><Icon icon="mdi:align-horizontal-center" /></el-icon>
      <span>{{ t('editor.alignCenter') }}</span>
    </el-menu-item>

    <el-menu-item index="align/right" @click="() => onAlign('right')">
      <el-icon><Icon icon="mdi:align-horizontal-right" /></el-icon>
      <span>{{ t('editor.alignRight') }}</span>
    </el-menu-item>

    <el-menu-item index="align/top" @click="() => onAlign('top')">
      <el-icon><Icon icon="mdi:align-vertical-top" /></el-icon>
      <span>{{ t('editor.alignTop') }}</span>
    </el-menu-item>

    <el-menu-item index="align/middle" @click="() => onAlign('middle')">
      <el-icon><Icon icon="mdi:align-vertical-center" /></el-icon>
      <span>{{ t('editor.alignMiddle') }}</span>
    </el-menu-item>

    <el-menu-item index="align/bottom" @click="() => onAlign('bottom')">
      <el-icon><Icon icon="mdi:align-vertical-bottom" /></el-icon>
      <span>{{ t('editor.alignBottom') }}</span>
    </el-menu-item>

    <el-menu-item index="distribute/horizontal" @click="() => onDistribute('horizontal')">
      <el-icon><Icon icon="mdi:align-horizontal-distribute" /></el-icon>
      <span>{{ t('editor.distributeHorizontally') }}</span>
    </el-menu-item>

    <el-menu-item index="distribute/vertical" @click="() => onDistribute('vertical')">
      <el-icon><Icon icon="mdi:align-vertical-distribute" /></el-icon>
      <span>{{ t('editor.distributeVertically') }}</span>
    </el-menu-item>
  </el-sub-menu>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { useI18n } from '@/i18n'

const { t } = useI18n()

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
