<template>
  <el-sub-menu index="actions">
    <template #title>
      <el-icon><Operation /></el-icon>
      <span>Actions</span>
    </template>
    <!-- View Json Config -->
    <el-menu-item index="actions/viewJsonConfig">
      <el-icon><View /></el-icon>
      <span>View</span>
      <span class="shortcut-hint">⌘ + .</span>
    </el-menu-item>
    <!-- Build -->
    <el-menu-item index="actions/build" @click="onBuild">
      <el-icon><Box /></el-icon>
      <span>Build</span>
    </el-menu-item>
    <!-- Save -->
    <el-menu-item index="actions/save" @click="onSave">
      <el-icon><Upload /></el-icon>
      <span>Save</span>
    </el-menu-item>
    <el-menu-item index="actions/screenshot" @click="onScreenshot">
      <el-icon><Picture /></el-icon>
      <span>Screenshot</span>
    </el-menu-item>
    <!-- Divider -->
    <el-divider direction="horizontal" class="menu-sub-divider" />
    <!-- App Properties -->
    <el-menu-item index="actions/properties" @click="onOpenProperties">
      <el-icon><Setting /></el-icon>
      <span>App Properties</span>
      <span class="shortcut-hint">⌘ + ,</span>
    </el-menu-item>
    <!-- Editor Settings -->
    <el-menu-item index="actions/editorSettings" @click="onOpenEditorSettings">
      <el-icon><Setting /></el-icon>
      <span>Editor Settings</span>
      <span class="shortcut-hint">⌘ + ;</span>
    </el-menu-item>
  </el-sub-menu>
</template>

<script setup>
import { Operation, View, Box, Upload, Picture, Setting } from '@element-plus/icons-vue'

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
  onOpenProperties: {
    type: Function,
    required: true,
  },
  onOpenEditorSettings: {
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

const onOpenProperties = () => {
  props.onOpenProperties && props.onOpenProperties()
}

const onOpenEditorSettings = () => {
  console.log('[AppMenuActions] Editor Settings menu clicked')
  if (typeof props.onOpenEditorSettings !== 'function') {
    console.warn('[AppMenuActions] onOpenEditorSettings prop is not a function', props.onOpenEditorSettings)
    return
  }
  props.onOpenEditorSettings()
}
</script>
