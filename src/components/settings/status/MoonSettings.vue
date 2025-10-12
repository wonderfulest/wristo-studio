<template>
  <div class="moon-properties">
    <el-collapse>
      <el-collapse-item title="Image" name="image">
        <el-form label-position="left" label-width="120px">
          <el-form-item label="Asset">
            <el-select v-model="element.imageUrl" placeholder="Select moon image" filterable @change="updateElement" style="width: 100%">
              <el-option
                v-for="opt in assetOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="Image Width">
            <el-input-number v-model="element.imageWidth" :min="1" :max="2000" @change="onWidthChange" />
          </el-form-item>
          <el-form-item label="Image Height">
            <el-input-number v-model="element.imageHeight" :min="1" :max="2000" @change="onHeightChange" />
          </el-form-item>
        </el-form>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useMoonStore } from '@/stores/elements/status/moonElement'
import type { FabricElement } from '@/types/element'

const props = defineProps<{ element: FabricElement }>()

const moonStore = useMoonStore()

// 初始属性通过 initElementProperties 设置

// 从画布元素中获取实际属性值
const initElementProperties = (): void => {
  const canvas = moonStore.baseStore.canvas
  if (!canvas) return
  const group = (canvas.getObjects() as Array<{ id?: string } & Record<string, unknown>>).find(o => o.id === props.element.id)
  if (!group) return

  const meta = group as unknown as { moonImageUrl?: string; moonImageWidth?: number; moonImageHeight?: number }
  const imageUrl = meta.moonImageUrl
  const imageWidth = meta.moonImageWidth
  const imageHeight = meta.moonImageHeight

  console.log('[MoonSettings] initElementProperties', { imageUrl, imageWidth, imageHeight })

  const el = props.element as unknown as { imageUrl?: string; imageWidth?: number; imageHeight?: number }
  if (typeof imageUrl === 'string') el.imageUrl = imageUrl
  if (typeof imageWidth === 'number') el.imageWidth = imageWidth
  if (typeof imageHeight === 'number') el.imageHeight = imageHeight
}

// 组件挂载时初始化属性
onMounted(() => {
  initElementProperties()
})

// load built asset urls for moon phases
type AssetOption = { label: string; value: string }
const assetModules = import.meta.glob('/src/assets/moonphase/*.png', { eager: true, import: 'default' }) as Record<string, string>
const assetOptions = computed<AssetOption[]>(() => {
  return Object.entries(assetModules)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, url]) => ({ label: path.split('/').pop() ?? path, value: url }))
})

// 更新元素
const updateElement = (): void => {
  console.log('[MoonSettings] updateElement', { 
    imageUrl: (props.element as unknown as { imageUrl?: string }).imageUrl, 
    imageWidth: (props.element as unknown as { imageWidth?: number }).imageWidth, 
    imageHeight: (props.element as unknown as { imageHeight?: number }).imageHeight 
  })
  
  // 更新画布上的元素
  moonStore.updateElement(props.element, {
    imageUrl: (props.element as unknown as { imageUrl?: string }).imageUrl,
    imageWidth: (props.element as unknown as { imageWidth?: number }).imageWidth,
    imageHeight: (props.element as unknown as { imageHeight?: number }).imageHeight,
  })
}

// 保持 1:1 的尺寸归一化
const normalizeSize = (v: number | undefined): number => {
  const n = Number.isFinite(v as number) ? Number(v) : 42
  return Math.max(1, n)
}

const setSquare = (size: number): void => {
  const el = props.element as unknown as { imageWidth?: number; imageHeight?: number }
  el.imageWidth = size
  el.imageHeight = size
}

const onWidthChange = (val: number): void => {
  const size = normalizeSize(val)
  setSquare(size)
  // 调用 store 的专用尺寸更新，保持画布即时同步
  moonStore.setImageSize(props.element, size, size)
  updateElement()
}

const onHeightChange = (val: number): void => {
  const size = normalizeSize(val)
  setSquare(size)
  moonStore.setImageSize(props.element, size, size)
  updateElement()
}
</script>

<style scoped>
.moon-properties {
  padding: 16px;
}
/* allow poppers to overflow out of collapse panels */
::v-deep(.el-collapse-item__wrap) {
  overflow: visible;
}
</style>
