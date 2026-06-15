<template>
  <el-sub-menu
    index="help"
    popper-class="app-menu-dropdown app-menu-rich-dropdown app-menu-help-dropdown"
    :popper-offset="8"
  >
    <template #title>
      <el-icon><QuestionFilled /></el-icon>
      <span>{{ t('editor.help') }}</span>
    </template>
    <div class="menu-group menu-group--help">
      <div class="menu-group-title">
        <el-icon><QuestionFilled /></el-icon>
        <span>{{ t('editor.help') }}</span>
      </div>
      <el-menu-item index="help/shortcuts" @click="onOpenShortcuts">
        <el-icon><Mouse /></el-icon>
        <span>{{ t('editor.keyboardMouseUsage') }}</span>
      </el-menu-item>
      <el-menu-item index="help/academy" @click="onOpenAcademy">
        <el-icon><Document /></el-icon>
        <span>{{ t('editor.creatorAcademy') }}</span>
      </el-menu-item>
      <el-menu-item index="help/feedback" @click="onOpenFeedback">
        <el-icon><ChatLineSquare /></el-icon>
        <span>{{ t('editor.sendFeedback') }}</span>
      </el-menu-item>
    </div>
  </el-sub-menu>
</template>

<script setup>
import { QuestionFilled, Mouse, ChatLineSquare, Document } from '@element-plus/icons-vue'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const props = defineProps({
  onOpenShortcuts: {
    type: Function,
    required: true,
  },
  onOpenFeedback: {
    type: Function,
    required: true,
  },
  onOpenAcademy: {
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

const onOpenAcademy = () => {
  props.onOpenAcademy && props.onOpenAcademy()
}
</script>
