<template>
  <el-sub-menu index="indicator">
    <template #title>
      <el-icon><Connection /></el-icon>
      <span>{{ t('editor.indicator') }}</span>
    </template>
    <div class="menu-group">
      <div class="menu-group-title">{{ t('editor.statusIndicators') }}</div>
      <el-menu-item index="indicator/battery" @click="onAddElement('status', 'battery')">
        <el-icon><Star /></el-icon>
        <span>{{ t('editor.batteryLevel') }}</span>
      </el-menu-item>
      <el-menu-item index="indicator/bluetooth" @click="onAddElement('indicator', 'bluetooth')">
        <el-icon><Connection /></el-icon>
        <span>{{ t('editor.bluetooth') }}</span>
      </el-menu-item>
      <el-menu-item index="indicator/notification" @click="onAddElement('indicator', 'notification')">
        <el-icon><Bell /></el-icon>
        <span>{{ t('editor.notifications') }}</span>
      </el-menu-item>
      <el-menu-item index="indicator/disturb" @click="onAddElement('indicator', 'disturb')">
        <el-icon><Bell /></el-icon>
        <span>{{ t('editor.doNotDisturb') }}</span>
      </el-menu-item>
      <el-menu-item index="indicator/alarms" @click="onAddElement('indicator', 'alarms')">
        <el-icon><Timer /></el-icon>
        <span>{{ t('editor.alarms') }}</span>
      </el-menu-item>
    </div>
  </el-sub-menu>
</template>

<script setup>
import { Connection, Star, Bell, Timer } from '@element-plus/icons-vue'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const emit = defineEmits(['add-element'])

const onAddElement = (category, elementType) => {
  emit('add-element', category, elementType)
}
</script>
