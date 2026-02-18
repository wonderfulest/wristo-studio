<template>
  <el-sub-menu index="weather">
    <template #title>
      <el-icon><Picture /></el-icon>
      <span>Weather</span>
    </template>
    <div class="menu-group">
      <div class="menu-group-title">Weather</div>
      <el-menu-item index="weather/weather" @click="onAddElement('weather', 'weather')">
        <el-icon><Picture /></el-icon>
        <span>Weather</span>
      </el-menu-item>
      <el-menu-item index="weather/moon" @click="onAddElement('weather', 'moon')">
        <el-icon><Picture /></el-icon>
        <span>Moon Phase</span>
      </el-menu-item>
    </div>
  </el-sub-menu>
</template>

<script setup>
import { Picture } from '@element-plus/icons-vue'

const emit = defineEmits(['add-element'])

const onAddElement = (category, elementType) => {
  emit('add-element', category, elementType)
}
</script>
