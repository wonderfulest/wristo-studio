<template>
  <el-sub-menu
    index="time"
    popper-class="app-menu-dropdown app-menu-rich-dropdown app-menu-time-dropdown"
    :popper-offset="8"
  >
    <template #title>
      <el-icon><Timer /></el-icon>
      <span>{{ t('editor.time') }}</span>
    </template>
    <!-- Time subgroup -->
    <div class="menu-group menu-group--time">
      <div class="menu-group-title">
        <el-icon><Timer /></el-icon>
        <span>{{ t('editor.time') }}</span>
      </div>
      <el-menu-item
        index="time/hour-minute"
        @click="onAddElement('time', 'time', { formatter: TimeFormatConstants.HH_MM, fontSize: 96 })"
      >
        <el-icon><Clock /></el-icon>
        <span>{{ t('editor.hourMinute') }}</span>
      </el-menu-item>
      <el-menu-item
        index="time/second"
        @click="onAddElement('time', 'time', { formatter: TimeFormatConstants.SS, fontSize: 36 })"
      >
        <el-icon><Clock /></el-icon>
        <span>{{ t('editor.second') }}</span>
      </el-menu-item>
      <el-menu-item
        index="time/am-pm"
        @click="onAddElement('time', 'time', { formatter: TimeFormatConstants.A, fontSize: 30 })"
      >
        <el-icon><Clock /></el-icon>
        <span>{{ t('editor.amPm') }}</span>
      </el-menu-item>
    </div>

    <!-- Date subgroup -->
    <div class="menu-group menu-group--date">
      <div class="menu-group-title">
        <el-icon><Calendar /></el-icon>
        <span>{{ t('editor.date') }}</span>
      </div>
      <el-menu-item
        index="time/month-day-with-weekday"
        @click="onAddElement('time', 'date', { formatter: DateFormatConstants.MMM_D_DDD, fontSize: 36 })"
      >
        <el-icon><Calendar /></el-icon>
        <span>{{ t('editor.monthDayWithWeekday') }}</span>
      </el-menu-item>
      <el-menu-item
        index="time/month-day"
        @click="onAddElement('time', 'date', { formatter: DateFormatConstants.MMM_D, fontSize: 36 })"
      >
        <el-icon><Calendar /></el-icon>
        <span>{{ t('editor.monthDay') }}</span>
      </el-menu-item>
      <el-menu-item
        index="time/month-day-slash"
        @click="onAddElement('time', 'date', { formatter: DateFormatConstants.MM_DD_YYYY, fontSize: 36 })"
      >
        <el-icon><Calendar /></el-icon>
        <span>{{ t('editor.monthDayYear') }}</span>
      </el-menu-item>
    </div>

    <!-- Analog subgroup -->
    <div class="menu-group menu-group--analog">
      <div class="menu-group-title">
        <el-icon><Watch /></el-icon>
        <span>{{ t('editor.analog') }}</span>
      </div>
      <el-menu-item index="time/hour-hand" @click="onAddElement('hands', 'hourHand')">
        <el-icon><Watch /></el-icon>
        <span>{{ t('editor.hourHand') }}</span>
      </el-menu-item>
      <el-menu-item index="time/minute-hand" @click="onAddElement('hands', 'minuteHand')">
        <el-icon><Watch /></el-icon>
        <span>{{ t('editor.minuteHand') }}</span>
      </el-menu-item>
      <el-menu-item index="time/second-hand" @click="onAddElement('hands', 'secondHand')">
        <el-icon><Watch /></el-icon>
        <span>{{ t('editor.secondHand') }}</span>
      </el-menu-item>
    </div>
  </el-sub-menu>
</template>

<script setup>
import { Timer, Clock, Calendar, Watch } from '@element-plus/icons-vue'
import { TimeFormatConstants } from '@/config/elements/options/timeFormats'
import { DateFormatConstants } from '@/config/elements/options/dateFormats'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const emit = defineEmits(['add-element'])

const onAddElement = (category, elementType, overrides = {}) => {
  emit('add-element', category, elementType, overrides)
}
</script>
