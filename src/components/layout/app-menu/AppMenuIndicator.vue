<template>
  <el-sub-menu index="indicator">
    <template #title>
      <el-icon><Connection /></el-icon>
      <span>Indicator</span>
    </template>
    <div class="menu-group">
      <div class="menu-group-title">Status Indicators</div>
      <el-menu-item index="indicator/battery" @click="onAddElement('status', 'battery')">
        <el-icon><Star /></el-icon>
        <span>Battery Level</span>
      </el-menu-item>
      <el-menu-item index="indicator/bluetooth" @click="onAddElement('indicator', 'bluetooth')">
        <el-icon><Connection /></el-icon>
        <span>Bluetooth</span>
      </el-menu-item>
      <el-menu-item index="indicator/notification" @click="onAddElement('indicator', 'notification')">
        <el-icon><Bell /></el-icon>
        <span>Notifications</span>
      </el-menu-item>
      <el-menu-item index="indicator/disturb" @click="onAddElement('indicator', 'disturb')">
        <el-icon><Bell /></el-icon>
        <span>Do Not Disturb</span>
      </el-menu-item>
      <el-menu-item index="indicator/alarms" @click="onAddElement('indicator', 'alarms')">
        <el-icon><Timer /></el-icon>
        <span>Alarms</span>
      </el-menu-item>
    </div>
  </el-sub-menu>
</template>

<script setup>
import { Connection, Star, Bell, Timer } from '@element-plus/icons-vue'

const emit = defineEmits(['add-element'])

const onAddElement = (category, elementType) => {
  emit('add-element', category, elementType)
}
</script>
