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
        v-model="speedMultiplier"
        class="speed-slider"
        :min="1"
        :max="1000"
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
const clampSpeedMultiplier = (value: number): number => {
  if (!Number.isFinite(value)) return 1
  return Math.min(1000, Math.max(1, Math.round(value)))
}

const speedMultiplier = ref<number>(clampSpeedMultiplier(getSimulatedClockSnapshot().speedMultiplier))
let timer: number | null = null

const pad2 = (value: number) => String(value).padStart(2, '0')

const formatTimeLabel = (date: Date) => `${pad2(date.getMonth() + 1)}/${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`

const syncFromClock = () => {
  const snapshot = getSimulatedClockSnapshot()
  currentTime.value = snapshot.currentTime
  speedMultiplier.value = clampSpeedMultiplier(snapshot.speedMultiplier)
}

const refreshCanvas = () => {
  syncFromClock()
  getDataSimulatorEngine().updateCanvas()
}

const handleSpeedInput = (value: number) => {
  setSimulatedSpeed(clampSpeedMultiplier(Number(value)))
  refreshCanvas()
}

const resetClock = () => {
  resetSimulatedClock()
  refreshCanvas()
}

const timeLabel = computed(() => formatTimeLabel(currentTime.value))

onMounted(() => {
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
  z-index: 12;
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
