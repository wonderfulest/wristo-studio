<template>
  <el-sub-menu
    index="weather"
    popper-class="app-menu-dropdown app-menu-rich-dropdown app-menu-weather-dropdown"
    :popper-offset="8"
  >
    <template #title>
      <el-icon><Cloudy /></el-icon>
      <span>{{ t('editor.weather') }}</span>
    </template>
    <div class="menu-group menu-group--weather">
      <div class="menu-group-title">
        <el-icon><Cloudy /></el-icon>
        <span>{{ t('editor.weather') }}</span>
      </div>
      <el-menu-item index="weather/weather" @click="onAddElement('weather', 'weather')">
        <el-icon><Sunny /></el-icon>
        <span>{{ t('editor.weather') }}</span>
      </el-menu-item>
      <el-menu-item index="weather/moon" @click="onAddElement('weather', 'moon')">
        <el-icon><MoonNight /></el-icon>
        <span>{{ t('editor.moonPhase') }}</span>
      </el-menu-item>
      <el-menu-item index="weather/windDirection" @click="onAddElement('weather', 'windDirection')">
        <el-icon><Compass /></el-icon>
        <span>{{ t('editor.windDirection') }}</span>
      </el-menu-item>
    </div>
  </el-sub-menu>
</template>

<script setup>
import { Cloudy, Compass, MoonNight, Sunny } from '@element-plus/icons-vue'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const emit = defineEmits(['add-element'])

const onAddElement = (category, elementType) => {
  emit('add-element', category, elementType)
}
</script>
