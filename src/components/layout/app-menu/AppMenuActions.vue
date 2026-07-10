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
    <el-menu-item index="actions/screenshot" @click="onScreenshot">
      <el-icon><Picture /></el-icon>
      <span>{{ t('editor.screenshot') }}</span>
    </el-menu-item>
    <el-menu-item index="actions/recordGif" @click="onRecordGif">
      <el-icon><VideoCamera /></el-icon>
      <span>{{ t('editor.recordGif') }}</span>
    </el-menu-item>
    <el-menu-item index="actions/exportWrt" @click="onExportWrt">
      <el-icon><Download /></el-icon>
      <span>{{ t('editor.exportWrt') }}</span>
    </el-menu-item>
    <el-menu-item index="actions/importWrt" @click="onImportWrt">
      <el-icon><Upload /></el-icon>
      <span>{{ t('editor.importWrt') }}</span>
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
import { Operation, View, Upload, Picture, VideoCamera, Download, Setting } from '@element-plus/icons-vue'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const props = defineProps({
  onScreenshot: {
    type: Function,
    required: true,
  },
  onRecordGif: {
    type: Function,
    required: true,
  },
  onExportWrt: {
    type: Function,
    required: true,
  },
  onImportWrt: {
    type: Function,
    required: true,
  },
  onOpenProperties: {
    type: Function,
    required: true,
  },
})

const onScreenshot = () => {
  props.onScreenshot && props.onScreenshot()
}

const onRecordGif = () => {
  props.onRecordGif && props.onRecordGif()
}

const onExportWrt = () => {
  props.onExportWrt && props.onExportWrt()
}

const onImportWrt = () => {
  props.onImportWrt && props.onImportWrt()
}

const onOpenProperties = () => {
  props.onOpenProperties && props.onOpenProperties()
}
</script>
