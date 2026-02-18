<template>
  <el-sub-menu index="help">
    <template #title>
      <el-icon><QuestionFilled /></el-icon>
      <span>Help</span>
    </template>
    <el-menu-item index="help/shortcuts" @click="onOpenShortcuts">
      <template #title>
        <el-icon><Mouse /></el-icon>
        <span>Keyboard/Mouse Usage</span>
      </template>
    </el-menu-item>
    <el-menu-item index="help/feedback" @click="onOpenFeedback">
      <template #title>
        <el-icon><ChatLineSquare /></el-icon>
        <span>Send Feedback</span>
      </template>
    </el-menu-item>
  </el-sub-menu>
</template>

<script setup>
import { QuestionFilled, Mouse, ChatLineSquare } from '@element-plus/icons-vue'

const props = defineProps({
  onOpenShortcuts: {
    type: Function,
    required: true,
  },
  onOpenFeedback: {
    type: Function,
    required: true,
  },
})

const onOpenShortcuts = () => {
  props.onOpenShortcuts && props.onOpenShortcuts()
}

const onOpenFeedback = () => {
  props.onOpenFeedback && props.onOpenFeedback()
}
</script>
