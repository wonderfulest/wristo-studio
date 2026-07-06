<template>
  <section class="time-simulator-panel" :aria-label="t('timeSimulator.title')">
    <div class="simulator-main">
      <Icon icon="material-symbols:timer-outline-rounded" width="18" height="18" />
      <div class="time-readout">
        <span class="panel-title">{{ t('timeSimulator.title') }}</span>
        <strong>{{ timeLabel }}</strong>
      </div>
    </div>

    <div class="speed-control">
      <span>{{ t('timeSimulator.speed') }}</span>
      <el-slider
        v-model="speedSliderValue"
        class="speed-slider"
        :min="SPEED_SLIDER_MIN"
        :max="SPEED_SLIDER_MAX"
        :step="1"
        :show-tooltip="false"
        @input="handleSpeedInput"
      />
      <strong class="speed-value">{{ speedMultiplier }}x</strong>
    </div>

    <el-button size="small" class="reset-button" @click="resetClock">
      <Icon icon="material-symbols:restart-alt-rounded" width="16" height="16" />
      <span>{{ t('timeSimulator.reset') }}</span>
    </el-button>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { useI18n } from '@/i18n'
import { getDataSimulatorEngine } from '@/engine/simulator/dataSimulatorEngine'
import { getSimulatedClockSnapshot, resetSimulatedClock, setSimulatedSpeed } from '@/engine/simulator/simulatedClock'

const { t } = useI18n()
const currentTime = ref<Date>(getSimulatedClockSnapshot().currentTime)

const SPEED_MIN = 1
const SPEED_MAX = 1000
const SPEED_SLIDER_MIN = 1
const SPEED_SLIDER_MAX = 1000
const SPEED_CURVE_EXPONENT = 2.4

const clampSpeedMultiplier = (value: number): number => {
  if (!Number.isFinite(value)) return SPEED_MIN
  return Math.min(SPEED_MAX, Math.max(SPEED_MIN, Math.round(value)))
}

const speedMultiplier = ref<number>(clampSpeedMultiplier(getSimulatedClockSnapshot().speedMultiplier))
const speedSliderValue = ref<number>(SPEED_SLIDER_MIN)
let timer: number | null = null

const pad2 = (value: number) => String(value).padStart(2, '0')

const formatTimeLabel = (date: Date) => `${pad2(date.getMonth() + 1)}/${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`

const normalizeSliderValue = (value: number): number => (value - SPEED_SLIDER_MIN) / (SPEED_SLIDER_MAX - SPEED_SLIDER_MIN)

const denormalizeSliderValue = (value: number): number => SPEED_SLIDER_MIN + value * (SPEED_SLIDER_MAX - SPEED_SLIDER_MIN)

const speedFromSliderValue = (value: number): number => {
  const normalizedValue = Math.min(1, Math.max(0, normalizeSliderValue(value)))
  const curvedValue = Math.pow(normalizedValue, SPEED_CURVE_EXPONENT)
  return clampSpeedMultiplier(SPEED_MIN + curvedValue * (SPEED_MAX - SPEED_MIN))
}

const sliderValueFromSpeed = (value: number): number => {
  const normalizedSpeed = (clampSpeedMultiplier(value) - SPEED_MIN) / (SPEED_MAX - SPEED_MIN)
  const curvedValue = Math.pow(normalizedSpeed, 1 / SPEED_CURVE_EXPONENT)
  return Math.round(denormalizeSliderValue(curvedValue))
}

const syncFromClock = () => {
  const snapshot = getSimulatedClockSnapshot()
  currentTime.value = snapshot.currentTime
  speedMultiplier.value = clampSpeedMultiplier(snapshot.speedMultiplier)
  speedSliderValue.value = sliderValueFromSpeed(speedMultiplier.value)
}

const refreshCanvas = () => {
  syncFromClock()
  getDataSimulatorEngine().updateCanvas()
}

const handleSpeedInput = (value: number) => {
  const nextSpeedMultiplier = speedFromSliderValue(Number(value))
  speedMultiplier.value = nextSpeedMultiplier
  speedSliderValue.value = sliderValueFromSpeed(nextSpeedMultiplier)
  setSimulatedSpeed(nextSpeedMultiplier)
  refreshCanvas()
}

const resetClock = () => {
  resetSimulatedClock()
  refreshCanvas()
}

const timeLabel = computed(() => formatTimeLabel(currentTime.value))

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
.reset-button {
  display: flex;
  align-items: center;
}

.simulator-main {
  gap: 8px;
  min-width: 158px;
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

.time-readout strong {
  font-size: 13px;
  font-variant-numeric: tabular-nums;
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
