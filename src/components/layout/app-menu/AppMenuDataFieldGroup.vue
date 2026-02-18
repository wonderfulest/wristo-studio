<template>
  <el-sub-menu index="datafield">
    <template #title>
      <el-icon><DataLine /></el-icon>
      <span>DataField</span>
    </template>
    <div class="menu-group">
      <div class="menu-group-title">DataField</div>
      <el-menu-item
        index="health/heart-rate"
        @click="onAddDataField(':FIELD_TYPE_HEART_RATE')"
      >
        <el-icon><Monitor /></el-icon>
        <span>Heart Rate</span>
      </el-menu-item>
      <el-menu-item
        index="health/steps"
        @click="onAddDataField(':FIELD_TYPE_STEPS')"
      >
        <el-icon><TrendCharts /></el-icon>
        <span>Steps</span>
      </el-menu-item>
      <el-menu-item
        index="health/calories"
        @click="onAddDataField(':FIELD_TYPE_CALORIES')"
      >
        <el-icon><Aim /></el-icon>
        <span>Calories</span>
      </el-menu-item>
      <el-menu-item
        index="health/distance"
        @click="onAddDataField(':FIELD_TYPE_DISTANCE')"
      >
        <el-icon><Aim /></el-icon>
        <span>Distance</span>
      </el-menu-item>
      <el-menu-item
        index="health/floors"
        @click="onAddDataField(':FIELD_TYPE_FLOORS_CLIMBED')"
      >
        <el-icon><TrendCharts /></el-icon>
        <span>Floors</span>
      </el-menu-item>
    </div>
    <AppMenuGoalGroup
      :on-add-progress-bar="onAddGoalProgressBar"
      :on-add-progress-arc="onAddGoalArc"
      :on-add-progress-segments="onAddGoalSegment"
    />
    <div class="menu-group">
      <div class="menu-group-title"><el-icon><TrendCharts /></el-icon>Chart</div>
      <el-menu-item index="chart/bar" @click="onAddElement('chart', 'barChart')">
        <el-icon><TrendCharts /></el-icon>
        <span>Bar Chart</span>
      </el-menu-item>
      <el-menu-item index="chart/line" @click="onAddElement('chart', 'lineChart')">
        <el-icon><DataLine /></el-icon>
        <span>Line Chart</span>
      </el-menu-item>
    </div>
  </el-sub-menu>
</template>

<script setup>
import { DataLine, TrendCharts, Aim, Monitor } from '@element-plus/icons-vue'
import AppMenuGoalGroup from '@/components/layout/app-menu/AppMenuGoalGroup.vue'

const emit = defineEmits([
  'add-data-field',
  'add-goal-progress-bar',
  'add-goal-arc',
  'add-goal-segment',
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

const onAddGoalSegment = () => {
  emit('add-goal-segment')
}

const onAddElement = (category, elementType) => {
  emit('add-element', category, elementType)
}
</script>
