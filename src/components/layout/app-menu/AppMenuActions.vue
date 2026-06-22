<template>
  <el-sub-menu index="actions">
    <template #title>
      <el-icon><Operation /></el-icon>
      <span>{{ t('editor.actions') }}</span>
    </template>
    <!-- View Json Config -->
    <el-menu-item index="actions/viewJsonConfig">
      <el-icon><View /></el-icon>
      <span>{{ t('editor.view') }}</span>
      <span class="shortcut-hint">⌘ + .</span>
    </el-menu-item>
    <!-- Build -->
    <el-menu-item index="actions/build" @click="onBuild">
      <el-icon><Box /></el-icon>
      <span>{{ t('editor.build') }}</span>
    </el-menu-item>
    <!-- Save -->
    <el-menu-item index="actions/save" @click="onSave">
      <el-icon><Upload /></el-icon>
      <span>{{ t('common.save') }}</span>
    </el-menu-item>
    <el-menu-item index="actions/screenshot" @click="onScreenshot">
      <el-icon><Picture /></el-icon>
      <span>{{ t('editor.screenshot') }}</span>
    </el-menu-item>
    <el-menu-item index="actions/recordGif" @click="onRecordGif">
      <el-icon><VideoCamera /></el-icon>
      <span>{{ t('editor.recordGif') }}</span>
    </el-menu-item>
    <!-- Divider -->
    <el-divider direction="horizontal" class="menu-sub-divider" />
    <!-- App Properties -->
    <el-menu-item index="actions/properties" @click="onOpenProperties">
      <el-icon><Setting /></el-icon>
      <span>{{ t('editor.appProperties') }}</span>
      <span class="shortcut-hint">⌘ + ,</span>
    </el-menu-item>
  </el-sub-menu>
</template>

<script setup>
import { Operation, View, Box, Upload, Picture, VideoCamera, Setting } from '@element-plus/icons-vue'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const props = defineProps({
  onBuild: {
    type: Function,
    required: true,
  },
  onSave: {
    type: Function,
    required: true,
  },
  onScreenshot: {
    type: Function,
    required: true,
  },
  onRecordGif: {
    type: Function,
    required: true,
  },
  onOpenProperties: {
    type: Function,
    required: true,
  },
})

const onBuild = () => {
  props.onBuild && props.onBuild()
}

const onSave = () => {
  props.onSave && props.onSave()
}

const onScreenshot = () => {
  props.onScreenshot && props.onScreenshot()
}

const onRecordGif = () => {
  props.onRecordGif && props.onRecordGif()
}

const onOpenProperties = () => {
  props.onOpenProperties && props.onOpenProperties()
}
</script>
