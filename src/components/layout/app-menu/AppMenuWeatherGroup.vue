<template>
  <el-sub-menu index="weather">
    <template #title>
      <el-icon><Picture /></el-icon>
      <span>{{ t('editor.weather') }}</span>
    </template>
    <div class="menu-group">
      <div class="menu-group-title">{{ t('editor.weather') }}</div>
      <el-menu-item index="weather/weather" @click="onAddElement('weather', 'weather')">
        <el-icon><Picture /></el-icon>
        <span>{{ t('editor.weather') }}</span>
      </el-menu-item>
      <el-menu-item index="weather/moon" @click="onAddElement('weather', 'moon')">
        <el-icon><Picture /></el-icon>
        <span>{{ t('editor.moonPhase') }}</span>
      </el-menu-item>
      <el-menu-item index="weather/windDirection" @click="onAddElement('weather', 'windDirection')">
        <el-icon><Picture /></el-icon>
        <span>{{ t('editor.windDirection') }}</span>
      </el-menu-item>
    </div>
  </el-sub-menu>
</template>

<script setup>
import { Picture } from '@element-plus/icons-vue'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const emit = defineEmits(['add-element'])

const onAddElement = (category, elementType) => {
  emit('add-element', category, elementType)
}
</script>
