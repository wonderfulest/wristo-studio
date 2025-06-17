<template>
    <div class="time-simulator">
        <div class="time-controls">
            <el-time-picker v-model="simulatedTime" format="HH:mm:ss" placeholder="选择时间" @change="handleTimeChange" class="time-picker" />
            <div class="speed-controls">
                <span class="speed-label">速度: {{ playbackSpeed }}x</span>
                <el-slider v-model="playbackSpeed" :min="1" :max="1000" :step="1" :show-stops="false"
                    :show-tooltip="true" :format-tooltip="(val: number) => `${val}x`" class="speed-slider" />
            </div>
            <div class="step-controls">
                <el-button-group class="step-buttons">
                    <el-button size="small" @click="stepBackward">-1分钟</el-button>
                    <el-button size="small" @click="stepForward">+1分钟</el-button>
                </el-button-group>
            </div>
            <el-switch v-model="isTimeSimulationActive" active-text="启用模拟" @change="handleSimulationToggle" class="simulation-switch" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useHourHandStore } from '@/stores/elements/hands/hourHandElement'  
import { useMinuteHandStore } from '@/stores/elements/hands/minuteHandElement'

const hourHandStore = useHourHandStore()
const minuteHandStore = useMinuteHandStore()
const simulatedTime = ref(new Date())
const playbackSpeed = ref(1)
const isTimeSimulationActive = ref(false)
let timer: number | null = null

const handleTimeChange = (time: Date) => {
    if (!time) return
    simulatedTime.value = time
    updatePointers()
}

const updatePointers = () => {
    hourHandStore.updateTime(simulatedTime.value)
    minuteHandStore.updateTime(simulatedTime.value)
}

const stepForward = () => {
    simulatedTime.value = new Date(simulatedTime.value.getTime() + 60000)
    updatePointers()
}

const stepBackward = () => {
    simulatedTime.value = new Date(simulatedTime.value.getTime() - 60000)
    updatePointers()
}

const handleSimulationToggle = (value: boolean) => {
    isTimeSimulationActive.value = value
    if (value) {
        timer = window.setInterval(() => {
            simulatedTime.value = new Date(simulatedTime.value.getTime() + 1000 * playbackSpeed.value)
            updatePointers()
        }, 1000)
    } else if (timer !== null) {
        clearInterval(timer)
        timer = null
    }
}

onMounted(() => {
    updatePointers()
})

onUnmounted(() => {
    if (timer !== null) {
        clearInterval(timer)
    }
})
</script>

<style scoped>
.time-simulator {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(255, 255, 255, 0.95);
    padding: 8px 12px;
    border-radius: 4px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    border: 1px solid rgba(0, 0, 0, 0.05);
}

.time-controls {
    display: flex;
    align-items: center;
    gap: 12px;
}

.speed-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 200px;
}

.speed-label {
    font-size: 13px;
    color: #666;
    font-weight: 500;
    white-space: nowrap;
}

:deep(.time-picker) {
    width: 120px;
}

:deep(.time-picker .el-input__wrapper) {
    box-shadow: none;
    border: 1px solid #dcdfe6;
    padding: 0 8px;
    height: 28px;
}

:deep(.time-picker .el-input__wrapper:hover) {
    border-color: #c0c4cc;
}

:deep(.time-picker .el-input__wrapper.is-focus) {
    border-color: #409eff;
    box-shadow: none;
}

:deep(.speed-slider) {
    flex: 1;
    margin: 0;
}

:deep(.speed-slider .el-slider__runway) {
    background-color: #ebeef5;
    height: 4px;
}

:deep(.speed-slider .el-slider__bar) {
    background-color: #409eff;
    height: 4px;
}

:deep(.speed-slider .el-slider__button) {
    width: 12px;
    height: 12px;
    border: 2px solid #409eff;
    background-color: #fff;
    box-shadow: none;
}

:deep(.speed-slider .el-slider__button:hover) {
    transform: scale(1.2);
}

.step-controls {
    display: flex;
    gap: 2px;
}

:deep(.step-buttons) {
    display: flex;
    gap: 2px;
}

:deep(.step-buttons .el-button) {
    border-radius: 2px;
    padding: 4px 8px;
    font-size: 12px;
    border: 1px solid #dcdfe6;
    background-color: #fff;
    color: #606266;
    height: 28px;
}

:deep(.step-buttons .el-button:hover) {
    color: #409eff;
    border-color: #c6e2ff;
    background-color: #ecf5ff;
}

:deep(.simulation-switch) {
    margin-left: 8px;
}

:deep(.simulation-switch .el-switch__core) {
    border-radius: 2px;
    height: 20px;
    width: 40px;
}

:deep(.simulation-switch .el-switch__action) {
    border-radius: 1px;
    width: 16px;
    height: 16px;
}

:deep(.simulation-switch .el-switch__label) {
    font-size: 12px;
    color: #606266;
}
</style>