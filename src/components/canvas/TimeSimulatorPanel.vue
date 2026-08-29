<template>
  <section class="time-simulator-panel" :aria-label="t('timeSimulator.title')">
    <div class="simulator-controls">
      <div class="simulator-main">
        <Icon icon="material-symbols:timer-outline-rounded" width="18" height="18" />
        <div class="time-readout">
          <span class="panel-title">{{ t('timeSimulator.title') }}</span>
          <el-date-picker
            v-model="currentTime"
            class="date-time-picker"
            type="datetime"
            :clearable="false"
            :editable="false"
            :teleported="true"
            format="MM/DD HH:mm:ss"
            @change="handleDateTimeChange"
            @visible-change="handleDateTimePickerVisibleChange"
          />
        </div>
      </div>

      <el-segmented
        v-model="clockMode"
        class="mode-control"
        :options="modeOptions"
        size="small"
        @change="handleModeChange"
      />

      <div v-if="clockMode === 'running'" class="speed-control">
        <span>{{ t('timeSimulator.speed') }}</span>
        <el-slider
          v-model="speedSliderValue"
          class="speed-slider"
          :min="0"
          :max="TIME_SIMULATOR_SPEEDS.length - 1"
          :step="1"
          :show-stops="true"
          :show-tooltip="false"
          @input="handleSpeedInput"
        />
        <strong class="speed-value">{{ speedMultiplier }}x</strong>
      </div>

      <el-button size="small" class="reset-button" @click="resetClock">
        <Icon icon="material-symbols:restart-alt-rounded" width="16" height="16" />
        <span>{{ t('timeSimulator.reset') }}</span>
      </el-button>
    </div>

    <div v-if="clockMode === 'fixed'" class="day-time-control">
      <span class="day-time-boundary">00:00</span>
      <el-slider
        v-model="dayMinute"
        class="day-time-slider"
        :min="0"
        :max="1439"
        :step="1"
        :show-tooltip="false"
        :aria-label="t('timeSimulator.dayTimeline')"
        @input="handleDayTimeInput"
      />
      <strong class="day-time-value">{{ dayTimeLabel }}</strong>
      <span class="day-time-boundary">24:00</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { useI18n } from '@/i18n'
import { getDataSimulatorEngine } from '@/engine/simulator/dataSimulatorEngine'
import {
  getSimulatedClockSnapshot,
  pauseSimulatedClock,
  resetSimulatedClock,
  resumeSimulatedClock,
  setSimulatedSpeed,
  setSimulatedTime,
} from '@/engine/simulator/simulatedClock'
import { TIME_SIMULATOR_SPEEDS, getSliderIndexForSpeed, getSpeedAtSliderIndex } from './timeSimulatorSpeed'

const { t } = useI18n()
const currentTime = ref<Date>(getSimulatedClockSnapshot().currentTime)

type ClockMode = 'fixed' | 'running'

const initialSnapshot = getSimulatedClockSnapshot()
const initialSpeed = initialSnapshot.isRunning ? initialSnapshot.speedMultiplier : 1
const speedMultiplier = ref<number>(getSpeedAtSliderIndex(getSliderIndexForSpeed(initialSpeed)))
const speedSliderValue = ref<number>(getSliderIndexForSpeed(speedMultiplier.value))
const clockMode = ref<ClockMode>(initialSnapshot.isRunning ? 'running' : 'fixed')
const dayMinute = ref(initialSnapshot.currentTime.getHours() * 60 + initialSnapshot.currentTime.getMinutes())
const isDateTimePickerVisible = ref(false)
let timer: number | null = null

const modeOptions = computed(() => [
  { label: t('timeSimulator.fixed'), value: 'fixed' },
  { label: t('timeSimulator.running'), value: 'running' },
])

const dayTimeLabel = computed(() => {
  const hours = Math.floor(dayMinute.value / 60)
  const minutes = dayMinute.value % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
})

const syncFromClock = () => {
  const snapshot = getSimulatedClockSnapshot()
  if (!isDateTimePickerVisible.value) {
    currentTime.value = snapshot.currentTime
  }
  dayMinute.value = snapshot.currentTime.getHours() * 60 + snapshot.currentTime.getMinutes()
  clockMode.value = snapshot.isRunning ? 'running' : 'fixed'
  if (snapshot.isRunning) {
    speedMultiplier.value = getSpeedAtSliderIndex(getSliderIndexForSpeed(snapshot.speedMultiplier))
    speedSliderValue.value = getSliderIndexForSpeed(speedMultiplier.value)
  }
}

const handleDateTimePickerVisibleChange = (visible: boolean) => {
  isDateTimePickerVisible.value = visible
}

const refreshCanvas = () => {
  syncFromClock()
  getDataSimulatorEngine().updateCanvas()
}

const handleSpeedInput = (value: number) => {
  const nextSpeedMultiplier = getSpeedAtSliderIndex(Number(value))
  speedMultiplier.value = nextSpeedMultiplier
  speedSliderValue.value = getSliderIndexForSpeed(nextSpeedMultiplier)
  if (clockMode.value === 'running') {
    setSimulatedSpeed(nextSpeedMultiplier)
    refreshCanvas()
  }
}

const handleDayTimeInput = (value: number) => {
  const nextMinute = Math.min(1439, Math.max(0, Math.round(Number(value))))
  const nextTime = new Date(getSimulatedClockSnapshot().currentTime)
  nextTime.setHours(Math.floor(nextMinute / 60), nextMinute % 60, 0, 0)

  pauseSimulatedClock()
  setSimulatedTime(nextTime)
  clockMode.value = 'fixed'
  currentTime.value = nextTime
  dayMinute.value = nextMinute
  getDataSimulatorEngine().updateCanvas()
}

const handleDateTimeChange = (value: Date | string | number | null) => {
  if (value == null) return
  const date = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(date.getTime())) return
  setSimulatedTime(date)
  refreshCanvas()
}

const handleModeChange = (value: string | number | boolean) => {
  clockMode.value = value === 'fixed' ? 'fixed' : 'running'
  if (clockMode.value === 'fixed') {
    pauseSimulatedClock()
  } else {
    resumeSimulatedClock(speedMultiplier.value)
  }
  refreshCanvas()
}

const resetClock = () => {
  resetSimulatedClock()
  clockMode.value = 'running'
  speedMultiplier.value = 1
  speedSliderValue.value = 0
  refreshCanvas()
}

onMounted(() => {
  syncFromClock()
  timer = window.setInterval(syncFromClock, 500)
})

onBeforeUnmount(() => {
  if (timer) {
    window.clearInterval(timer)
    timer = null
  }
})
</script>

<style scoped>
.time-simulator-panel {
  position: absolute;
  left: 50%;
  bottom: 22px;
  z-index: var(--studio-z-workspace-control-active);
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: min(840px, calc(100% - 32px));
  padding: 8px 10px;
  border: 1px solid var(--studio-border);
  border-radius: 8px;
  background: color-mix(in srgb, var(--studio-surface) 94%, transparent);
  color: var(--studio-text);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.16);
  transform: translateX(-50%);
  backdrop-filter: blur(10px);
}

.simulator-controls,
.day-time-control {
  display: flex;
  width: 100%;
  align-items: center;
}

.simulator-controls {
  gap: 10px;
}

.day-time-control {
  gap: 8px;
  padding: 0 4px;
}

.day-time-slider {
  flex: 1;
  min-width: 320px;
}

.day-time-boundary,
.day-time-value {
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.day-time-boundary {
  color: var(--studio-text-muted);
}

.day-time-value {
  width: 36px;
  color: var(--studio-text);
  text-align: center;
}

.simulator-main,
.speed-control,
.reset-button {
  display: flex;
  align-items: center;
}

.simulator-main {
  gap: 8px;
  min-width: 182px;
}

.time-readout {
  display: flex;
  flex-direction: column;
  gap: 3px;
  line-height: 1;
}

.panel-title,
.speed-control span {
  font-size: 11px;
  color: var(--studio-text-muted);
}

.date-time-picker {
  width: 152px;
}

.date-time-picker :deep(.el-input__wrapper) {
  min-height: 24px;
  padding: 0 6px;
  background: transparent;
  box-shadow: none;
}

.date-time-picker :deep(.el-input__prefix) {
  display: none;
}

.date-time-picker :deep(.el-input__inner) {
  color: var(--studio-text);
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.mode-control {
  flex: 0 0 auto;
}

.speed-control {
  gap: 6px;
  min-width: 260px;
}

.speed-slider {
  flex: 1;
  min-width: 160px;
}

.speed-value {
  width: 48px;
  color: var(--studio-text);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  text-align: right;
}

.reset-button {
  gap: 4px;
}

@media (max-width: 1180px) {
  .time-simulator-panel {
    justify-content: center;
    bottom: 14px;
  }

  .simulator-controls {
    flex-wrap: wrap;
    justify-content: center;
  }

  .day-time-slider {
    min-width: 220px;
  }
}
</style>
