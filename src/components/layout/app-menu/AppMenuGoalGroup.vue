<template>
  <div class="menu-group">
    <div class="menu-group-title">{{ t('editor.goal') }}</div>
    <el-menu-item index="goal/progress-bar" @click="onAddProgressBar">
      <el-icon><Operation /></el-icon>
      <span>{{ t('editor.progressBar') }}</span>
    </el-menu-item>
    <el-menu-item index="goal/progress-arc" @click="onAddProgressArc">
      <el-icon><Operation /></el-icon>
      <span>{{ t('editor.progressArc') }}</span>
    </el-menu-item>
    <el-menu-item index="goal/progress-segments" @click="onAddProgressSegments">
      <el-icon><Operation /></el-icon>
      <span>{{ t('editor.progressSegments') }}</span>
    </el-menu-item>
  </div>
</template>

<script setup>
import { Operation } from '@element-plus/icons-vue'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const props = defineProps({
  onAddProgressBar: {
    type: Function,
    required: true,
  },
  onAddProgressArc: {
    type: Function,
    required: true,
  },
  onAddProgressSegments: {
    type: Function,
    required: true,
  },
})

const onAddProgressBar = () => {
  props.onAddProgressBar && props.onAddProgressBar()
}

const onAddProgressArc = () => {
  props.onAddProgressArc && props.onAddProgressArc()
}

const onAddProgressSegments = () => {
  props.onAddProgressSegments && props.onAddProgressSegments()
}
</script>
