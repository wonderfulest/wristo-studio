<template>
  <div class="menu-group">
    <div class="menu-group-title">Goal</div>
    <el-menu-item index="goal/progress-bar" @click="onAddProgressBar">
      <el-icon><Operation /></el-icon>
      <span>Progress Bar</span>
    </el-menu-item>
    <el-menu-item index="goal/progress-arc" @click="onAddProgressArc">
      <el-icon><Operation /></el-icon>
      <span>Progress Arc</span>
    </el-menu-item>
    <el-menu-item index="goal/progress-segments" @click="onAddProgressSegments">
      <el-icon><Operation /></el-icon>
      <span>Progress Segments</span>
    </el-menu-item>
  </div>
</template>

<script setup>
import { Operation } from '@element-plus/icons-vue'

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
