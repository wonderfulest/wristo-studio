<template>
  <section class="time-simulator-panel" :aria-label="t('timeSimulator.title')">
    <div class="simulator-main">
      <Icon icon="material-symbols:timer-outline-rounded" width="18" height="18" />
      <div class="time-readout">
        <span class="panel-title">{{ t('timeSimulator.title') }}</span>
        <strong>{{ timeLabel }}</strong>
      </div>
    </div>

    <div class="simulator-controls">
      <el-button size="small" @click="advance(-60 * 60 * 1000)">
        {{ t('timeSimulator.minusHour') }}
      </el-button>
      <el-button size="small" @click="advance(-15 * 60 * 1000)">
        {{ t('timeSimulator.minusQuarter') }}
      </el-button>
      <el-button size="small" @click="advance(15 * 60 * 1000)">
        {{ t('timeSimulator.plusQuarter') }}
      </el-button>
      <el-button size="small" @click="advance(60 * 60 * 1000)">
        {{ t('timeSimulator.plusHour') }}
      </el-button>
    </div>

    <div class="speed-control">
      <span>{{ t('timeSimulator.speed') }}</span>
      <el-select v-model="speedMultiplier" size="small" class="speed-select" @change="handleSpeedChange">
        <el-option label="0x" :value="0" />
        <el-option label="1x" :value="1" />
        <el-option label="60x" :value="60" />
        <el-option label="360x" :value="360" />
        <el-option label="1440x" :value="1440" />
      </el-select>
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
import { advanceSimulatedTime, getSimulatedClockSnapshot, resetSimulatedClock, setSimulatedSpeed } from '@/engine/simulator/simulatedClock'

const { t } = useI18n()
const currentTime = ref<Date>(getSimulatedClockSnapshot().currentTime)
const speedMultiplier = ref<number>(getSimulatedClockSnapshot().speedMultiplier)
let timer: number | null = null

const pad2 = (value: number) => String(value).padStart(2, '0')

const formatTimeLabel = (date: Date) => `${pad2(date.getMonth() + 1)}/${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`

const syncFromClock = () => {
  const snapshot = getSimulatedClockSnapshot()
  currentTime.value = snapshot.currentTime
  speedMultiplier.value = snapshot.speedMultiplier
}

const refreshCanvas = () => {
  syncFromClock()
  getDataSimulatorEngine().updateCanvas()
}

const advance = (deltaMs: number) => {
  advanceSimulatedTime(deltaMs)
  refreshCanvas()
}

const handleSpeedChange = (value: number) => {
  setSimulatedSpeed(Number(value))
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
.simulator-controls,
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

.simulator-controls {
  gap: 4px;
}

.speed-control {
  gap: 6px;
}

.speed-select {
  width: 82px;
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
