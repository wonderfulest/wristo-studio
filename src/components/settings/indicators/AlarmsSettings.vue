<template>
    <div class="settings-section">
        <div class="setting-item">
            <label>颜色</label>
            <ColorPicker v-model="color" @update:modelValue="updateColor" />
        </div>

        <div class="setting-item">
            <label>字体</label>
            <FontPicker v-model="fontFamily" :font-type="'icon'" @update:modelValue="updateFontFamily" />
        </div>

        <div class="setting-item">
            <label>大小</label>
            <el-select v-model="fontSize" placeholder="选择大小" @change="updateFontSize">
                <el-option v-for="size in availableFontSizes" :key="size" :label="size + 'px'" :value="size" />
            </el-select>
        </div>

        <div class="setting-item">
            <label>位置</label>
            <PositionInputs :left="element.left" :top="element.top" @update:left="(v) => element.left = v"
                @update:top="(v) => element.top = v"
                @change="(p) => updateElement({ left: Math.round(p.left), top: Math.round(p.top) })" />
        </div>
    </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import ColorPicker from '@/components/color-picker/index.vue'
import FontPicker from '@/components/font-picker/font-picker.vue'
import { useBaseStore } from '@/stores/baseStore'
import { fontSizes } from '@/config/settings'
import PositionInputs from '@/components/settings/common/PositionInputs.vue'

const props = defineProps({
    element: {
        type: Object,
        required: true
    }
})

const baseStore = useBaseStore()

// 响应式状态
const color = ref(props.element?.fill || '#ffffff')
const fontFamily = ref(props.element?.fontFamily || 'Yoghurt-One')
const fontSize = ref(props.element?.fontSize || 24)
const positionX = ref(Math.round(props.element?.left || 0))
const positionY = ref(Math.round(props.element?.top || 0))

// 计算可用的字体大小（最大到96）
const availableFontSizes = computed(() => {
    return fontSizes.filter((size) => size <= 96)
})

// 更新颜色
const updateColor = (newColor) => {
    if (!props.element || !baseStore.canvas) return
    props.element.set('fill', newColor)
    baseStore.canvas.renderAll()
}

// 更新字体
const updateFontFamily = (newFontFamily) => {
    if (!props.element || !baseStore.canvas) return
    props.element.set('fontFamily', newFontFamily)
    baseStore.canvas.renderAll()
}

// 更新字体大小
const updateFontSize = (newSize) => {
    if (!props.element || !baseStore.canvas) return
    props.element.set('fontSize', newSize)
    baseStore.canvas.renderAll()
}

// 更新位置
const updatePosition = () => {
    if (!props.element || !baseStore.canvas) return
    props.element.set({
        left: positionX.value,
        top: positionY.value
    })
    baseStore.canvas.renderAll()
}

// 监听画布上的对象变化
watch(
    () => props.element?.left,
    (newLeft) => {
        if (newLeft !== undefined) {
            positionX.value = Math.round(newLeft)
        }
    }
)

watch(
    () => props.element?.top,
    (newTop) => {
        if (newTop !== undefined) {
            positionY.value = Math.round(newTop)
        }
    }
)
</script>

<style scoped>
@import '@/assets/styles/settings.css';

.position-inputs {
    display: flex;
    gap: 16px;
}

.position-inputs div {
    display: flex;
    align-items: center;
    gap: 8px;
}

.position-inputs input {
    width: 80px;
    padding: 4px 8px;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
}
</style>