<template>
  <el-sub-menu
    index="datafield"
    popper-class="app-menu-dropdown app-menu-rich-dropdown app-menu-datafield-dropdown"
    :popper-offset="8"
  >
    <template #title>
      <el-icon><DataLine /></el-icon>
      <span>{{ t('editor.dataField') }}</span>
    </template>
    <div class="menu-group menu-group--data-field">
      <div class="menu-group-title">
        <el-icon><DataLine /></el-icon>
        <span>{{ t('editor.dataField') }}</span>
      </div>
      <el-menu-item
        index="health/heart-rate"
        @click="onAddDataField(':FIELD_TYPE_HEART_RATE')"
      >
        <el-icon><Monitor /></el-icon>
        <span>{{ t('editor.heartRate') }}</span>
      </el-menu-item>
      <el-menu-item
        index="health/steps"
        @click="onAddDataField(':FIELD_TYPE_STEPS')"
      >
        <el-icon><TrendCharts /></el-icon>
        <span>{{ t('editor.steps') }}</span>
      </el-menu-item>
      <el-menu-item
        index="health/calories"
        @click="onAddDataField(':FIELD_TYPE_CALORIES')"
      >
        <el-icon><Aim /></el-icon>
        <span>{{ t('editor.calories') }}</span>
      </el-menu-item>
      <el-menu-item
        index="health/distance"
        @click="onAddDataField(':FIELD_TYPE_DISTANCE')"
      >
        <el-icon><Aim /></el-icon>
        <span>{{ t('editor.distance') }}</span>
      </el-menu-item>
      <el-menu-item
        index="health/floors"
        @click="onAddDataField(':FIELD_TYPE_FLOORS_CLIMBED')"
      >
        <el-icon><TrendCharts /></el-icon>
        <span>{{ t('editor.floors') }}</span>
      </el-menu-item>
    </div>
    <AppMenuGoalGroup
      :on-add-progress-bar="onAddGoalProgressBar"
      :on-add-progress-arc="onAddGoalArc"
    />
    <div class="menu-group menu-group--dial">
      <div class="menu-group-title">
        <el-icon><Odometer /></el-icon>
        <span>{{ t('editor.subDial') }}</span>
      </div>
      <el-menu-item index="dial/sub-dial-goal" @click="onAddElement('dials', 'subDial', { progressMode: 'goal' })">
        <el-icon><Odometer /></el-icon>
        <span>Goal Sub-dial</span>
      </el-menu-item>
      <el-menu-item index="dial/sub-dial-range" @click="onAddElement('dials', 'subDial', { progressMode: 'range' })">
        <el-icon><Odometer /></el-icon>
        <span>Range Sub-dial</span>
      </el-menu-item>
    </div>
    <div class="menu-group menu-group--chart">
      <div class="menu-group-title">
        <el-icon><TrendCharts /></el-icon>
        <span>{{ t('editor.chart') }}</span>
      </div>
      <el-menu-item index="chart/bar" @click="onAddElement('chart', 'barChart')">
        <el-icon><TrendCharts /></el-icon>
        <span>{{ t('editor.barChart') }}</span>
      </el-menu-item>
      <el-menu-item index="chart/line" @click="onAddElement('chart', 'lineChart')">
        <el-icon><DataLine /></el-icon>
        <span>{{ t('editor.lineChart') }}</span>
      </el-menu-item>
    </div>
  </el-sub-menu>
</template>

<script setup>
import { DataLine, TrendCharts, Aim, Monitor, Odometer } from '@element-plus/icons-vue'
import AppMenuGoalGroup from '@/components/layout/app-menu/AppMenuGoalGroup.vue'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const emit = defineEmits([
  'add-data-field',
  'add-goal-progress-bar',
  'add-goal-arc',
  'add-element',
])

const onAddDataField = (metricSymbol) => {
  emit('add-data-field', metricSymbol)
}

const onAddGoalProgressBar = () => {
  emit('add-goal-progress-bar')
}

const onAddGoalArc = () => {
  emit('add-goal-arc')
}

const onAddElement = (category, elementType, overrides = {}) => {
  emit('add-element', category, elementType, overrides)
}
</script>
