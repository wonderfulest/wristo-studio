<template>
  <el-sub-menu index="time">
    <template #title>
      <el-icon><Timer /></el-icon>
      <span>Time</span>
    </template>
    <!-- Time subgroup -->
    <div class="menu-group">
      <div class="menu-group-title">Time</div>
      <el-menu-item
        index="time/hour-minute"
        @click="onAddElement('time', 'time', { formatter: TimeFormatConstants.HH_MM, fontSize: 96 })"
      >
        <el-icon><Clock /></el-icon>
        <span>hour:minute</span>
      </el-menu-item>
      <el-menu-item
        index="time/second"
        @click="onAddElement('time', 'time', { formatter: TimeFormatConstants.SS, fontSize: 36 })"
      >
        <el-icon><Clock /></el-icon>
        <span>second</span>
      </el-menu-item>
      <el-menu-item
        index="time/am-pm"
        @click="onAddElement('time', 'time', { formatter: TimeFormatConstants.A, fontSize: 30 })"
      >
        <el-icon><Clock /></el-icon>
        <span>am/pm</span>
      </el-menu-item>
    </div>

    <!-- Date subgroup -->
    <div class="menu-group">
      <div class="menu-group-title">Date</div>
      <el-menu-item
        index="time/month-day-with-weekday"
        @click="onAddElement('time', 'date', { formatter: DateFormatConstants.MMM_D_DDD, fontSize: 36 })"
      >
        <el-icon><Calendar /></el-icon>
        <span>month day (with weekday)</span>
      </el-menu-item>
      <el-menu-item
        index="time/month-day"
        @click="onAddElement('time', 'date', { formatter: DateFormatConstants.MMM_D, fontSize: 36 })"
      >
        <el-icon><Calendar /></el-icon>
        <span>month day</span>
      </el-menu-item>
      <el-menu-item
        index="time/month-day-slash"
        @click="onAddElement('time', 'date', { formatter: DateFormatConstants.MM_DD_YYYY, fontSize: 36 })"
      >
        <el-icon><Calendar /></el-icon>
        <span>month/day/year</span>
      </el-menu-item>
    </div>

    <!-- Analog subgroup -->
    <div class="menu-group">
      <div class="menu-group-title">Analog</div>
      <el-menu-item index="time/hour-hand" @click="onAddElement('hands', 'hourHand')">
        <el-icon><Watch /></el-icon>
        <span>Hour hand</span>
      </el-menu-item>
      <el-menu-item index="time/minute-hand" @click="onAddElement('hands', 'minuteHand')">
        <el-icon><Watch /></el-icon>
        <span>Minute hand</span>
      </el-menu-item>
      <el-menu-item index="time/second-hand" @click="onAddElement('hands', 'secondHand')">
        <el-icon><Watch /></el-icon>
        <span>Second hand</span>
      </el-menu-item>
    </div>
  </el-sub-menu>
</template>

<script setup>
import { Timer, Clock, Calendar, Watch } from '@element-plus/icons-vue'
import { TimeFormatConstants } from '@/config/elements/options/timeFormats'
import { DateFormatConstants } from '@/config/elements/options/dateFormats'

const emit = defineEmits(['add-element'])

const onAddElement = (category, elementType, overrides = {}) => {
  emit('add-element', category, elementType, overrides)
}
</script>
