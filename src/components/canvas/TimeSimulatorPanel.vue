<template>
  <section class="time-simulator-panel" :aria-label="t('timeSimulator.title')">
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
          :disabled="handCalibrationState.active"
          :teleported="true"
          format="MM/DD HH:mm:ss"
          @change="handleDateTimeChange"
        />
      </div>
    </div>

    <el-segmented
      v-model="clockMode"
      class="mode-control"
      :options="modeOptions"
      size="small"
      :disabled="handCalibrationState.active"
      @change="handleModeChange"
    />

    <div class="speed-control">
      <span>{{ t('timeSimulator.speed') }}</span>
      <el-slider
        v-model="speedSliderValue"
        class="speed-slider"
        :min="0"
        :max="TIME_SIMULATOR_SPEEDS.length - 1"
        :step="1"
        :show-stops="true"
        :show-tooltip="false"
        :disabled="handCalibrationState.active"
        @input="handleSpeedInput"
      />
      <strong class="speed-value">{{ speedMultiplier }}x</strong>
    </div>

    <el-button size="small" class="reset-button" :disabled="handCalibrationState.active" @click="resetClock">
      <Icon icon="material-symbols:restart-alt-rounded" width="16" height="16" />
      <span>{{ t('timeSimulator.reset') }}</span>
    </el-button>

    <el-button
      size="small"
      class="calibration-button"
      :type="handCalibrationState.active ? 'primary' : 'default'"
      @click="toggleHandCalibration"
    >
      <Icon icon="material-symbols:my-location-rounded" width="16" height="16" />
      <span>{{ t(handCalibrationState.active ? 'timeSimulator.finishCalibration' : 'timeSimulator.calibrateHands') }}</span>
    </el-button>
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
import {
  handCalibrationState,
  startHandCalibration,
  stopHandCalibration,
} from '@/elements/hands/common/handCalibration'

const { t } = useI18n()
const currentTime = ref<Date>(getSimulatedClockSnapshot().currentTime)

type ClockMode = 'fixed' | 'running'

const initialSnapshot = getSimulatedClockSnapshot()
const initialSpeed = initialSnapshot.isRunning ? initialSnapshot.speedMultiplier : 1
const speedMultiplier = ref<number>(getSpeedAtSliderIndex(getSliderIndexForSpeed(initialSpeed)))
const speedSliderValue = ref<number>(getSliderIndexForSpeed(speedMultiplier.value))
const clockMode = ref<ClockMode>(initialSnapshot.isRunning ? 'running' : 'fixed')
let timer: number | null = null
let calibrationClockSnapshot: ReturnType<typeof getSimulatedClockSnapshot> | null = null

const modeOptions = computed(() => [
  { label: t('timeSimulator.fixed'), value: 'fixed' },
  { label: t('timeSimulator.running'), value: 'running' },
])

const syncFromClock = () => {
  const snapshot = getSimulatedClockSnapshot()
  currentTime.value = snapshot.currentTime
  clockMode.value = snapshot.isRunning ? 'running' : 'fixed'
  if (snapshot.isRunning) {
    speedMultiplier.value = getSpeedAtSliderIndex(getSliderIndexForSpeed(snapshot.speedMultiplier))
    speedSliderValue.value = getSliderIndexForSpeed(speedMultiplier.value)
  }
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

const finishHandCalibration = () => {
  if (!handCalibrationState.active) return
  stopHandCalibration()
  if (calibrationClockSnapshot) {
    setSimulatedTime(calibrationClockSnapshot.currentTime)
    if (calibrationClockSnapshot.isRunning) {
      resumeSimulatedClock(calibrationClockSnapshot.speedMultiplier)
    } else {
      pauseSimulatedClock()
    }
  }
  calibrationClockSnapshot = null
  refreshCanvas()
}

const toggleHandCalibration = () => {
  if (handCalibrationState.active) {
    finishHandCalibration()
    return
  }
  const snapshot = getSimulatedClockSnapshot()
  if (!startHandCalibration()) return
  calibrationClockSnapshot = snapshot
  const noon = new Date(snapshot.currentTime)
  noon.setHours(12, 0, 0, 0)
  setSimulatedTime(noon)
  pauseSimulatedClock()
  refreshCanvas()
}

onMounted(() => {
  syncFromClock()
  timer = window.setInterval(syncFromClock, 500)
})

onBeforeUnmount(() => {
  finishHandCalibration()
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
  align-items: center;
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

.simulator-main,
.speed-control,
.reset-button,
.calibration-button {
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
    flex-wrap: wrap;
    justify-content: center;
    bottom: 14px;
  }
}
</style>
