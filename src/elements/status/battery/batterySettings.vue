<template>
  <div class="battery-properties">
    <!-- 基础尺寸配置 -->
    <el-collapse v-model="activeNames">
      <el-collapse-item title="基础尺寸" name="size">
        <el-form label-position="left" label-width="100px">
          <el-form-item label="宽度">
            <el-input-number v-model="currentModel.width" :min="20" :max="500" @change="updateElement" />
          </el-form-item>
          <el-form-item label="高度">
            <el-input-number v-model="currentModel.height" :min="10" :max="300" @change="updateElement" />
          </el-form-item>
          <el-form-item label="内边距">
            <el-input-number v-model="currentModel.padding" :min="0" :max="20" @change="updateElement" />
          </el-form-item>
          <el-form-item label="头部间距">
            <el-input-number v-model="currentModel.headGap" :min="0" :max="20" @change="updateElement" />
          </el-form-item>
        </el-form>
      </el-collapse-item>

      <!-- 电池主体样式 -->
      <el-collapse-item title="电池主体样式" name="body">
        <el-form label-position="left" label-width="100px">
          <el-form-item label="边框颜色">
            <color-picker v-model="currentModel.bodyStroke" @change="updateElement" />
          </el-form-item>
          <el-form-item label="填充颜色">
            <color-picker v-model="currentModel.bodyFill" @change="updateElement" />
          </el-form-item>
          <el-form-item label="边框宽度">
            <el-input-number v-model="currentModel.bodyStrokeWidth" :min="0" :max="10" @change="updateElement" />
          </el-form-item>
          <el-form-item label="圆角半径X">
            <el-input-number v-model="currentModel.bodyRx" :min="0" :max="50" @change="updateElement" />
          </el-form-item>
          <el-form-item label="圆角半径Y">
            <el-input-number v-model="currentModel.bodyRy" :min="0" :max="50" @change="updateElement" />
          </el-form-item>
        </el-form>
      </el-collapse-item>

      <!-- 电池头部样式 -->
      <el-collapse-item title="电池头部样式" name="head">
        <el-form label-position="left" label-width="100px">
          <el-form-item label="宽度">
            <el-input-number v-model="currentModel.headWidth" :min="2" :max="50" @change="updateElement" />
          </el-form-item>
          <el-form-item label="高度">
            <el-input-number v-model="currentModel.headHeight" :min="2" :max="100" @change="updateElement" />
          </el-form-item>
          <el-form-item label="填充颜色">
            <color-picker v-model="currentModel.headFill" @change="updateElement" />
          </el-form-item>
          <el-form-item label="圆角半径X">
            <el-input-number v-model="currentModel.headRx" :min="0" :max="20" @change="updateElement" />
          </el-form-item>
          <el-form-item label="圆角半径Y">
            <el-input-number v-model="currentModel.headRy" :min="0" :max="20" @change="updateElement" />
          </el-form-item>
        </el-form>
      </el-collapse-item>

      <!-- 电量显示样式 -->
      <el-collapse-item title="电量显示样式" name="level">
        <el-form label-position="left" label-width="100px">
          <el-form-item label="电量">
            <el-slider v-model="currentModel.level" :min="0" :max="1" :step="0.01" :format-tooltip="(val) => `${Math.round(val * 100)}%`" @change="updateElement" />
          </el-form-item>
          <el-form-item label="低电量颜色（<20%）">
            <color-picker v-model="currentModel.levelColorLow" @change="updateElement" />
          </el-form-item>
          <el-form-item label="中等电量颜色（20%-50%）">
            <color-picker v-model="currentModel.levelColorMedium" @change="updateElement" />
          </el-form-item>
          <el-form-item label="高电量颜色（>50%）">
            <color-picker v-model="currentModel.levelColorHigh" @change="updateElement" />
          </el-form-item>
        </el-form>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import * as elementManager from '@/engine/managers/elementManager'
import { useBatteryStore } from '@/elements/status/battery/batteryElement'
import ColorPicker from '@/components/color-picker/index.vue'
import { useCanvasStore } from '@/stores/canvasStore'

const canvasStore = useCanvasStore()

const props = defineProps({
  // 旧通道：直接传入 FabricElement
  element: {
    type: Object,
    required: false,
  },
  // 新通道：业务配置 + 通用补丁函数
  config: {
    type: Object,
    required: false,
  },
  applyPatch: {
    type: Function,
    required: false,
  },
})

const batteryStore = useBatteryStore()

// 默认全部面板展开
const activeNames = ref(['size', 'body', 'head', 'level'])

// 当前表单绑定的数据源：优先使用业务 config，其次回退到 FabricElement
const currentModel = computed<any>(() => {
  return (props.config as any) ?? props.element ?? {}
})

// 确保单独的颜色字段存在（仅旧通道下需要，优先读取画布组的分散颜色字段）
if (!props.applyPatch && props.element) {
  const group = canvasStore.canvas?.getObjects().find((obj) => obj.id === (props.element as any).id)
  if ((props.element as any).levelColorLow == null) {
    ;(props.element as any).levelColorLow = (group as any)?.levelColorLow || batteryStore.defaultLevelColorLow
  }
  if ((props.element as any).levelColorMedium == null) {
    ;(props.element as any).levelColorMedium = (group as any)?.levelColorMedium || batteryStore.defaultLevelColorMedium
  }
  if ((props.element as any).levelColorHigh == null) {
    ;(props.element as any).levelColorHigh = (group as any)?.levelColorHigh || batteryStore.defaultLevelColorHigh
  }
}

// 从画布元素中获取实际属性值
const initElementProperties = () => {
  const group = canvasStore.canvas?.getObjects().find((obj) => obj.id === props.element.id)
  if (!group || !group.getObjects) return

  const objects = group.getObjects()
  const batteryBody = objects.find((obj) => obj.id.endsWith('_body'))
  const batteryHead = objects.find((obj) => obj.id.endsWith('_head'))
  const batteryLevel = objects.find((obj) => obj.id.endsWith('_level'))

  if (!batteryBody || !batteryHead || !batteryLevel) return

  // 更新所有属性值
  ;(props.element as any).width = Math.round((batteryBody as any).width)
  ;(props.element as any).height = Math.round((batteryBody as any).height)
  ;(props.element as any).bodyFill = (batteryBody as any).fill
  ;(props.element as any).bodyStroke = (batteryBody as any).stroke
  ;(props.element as any).bodyStrokeWidth = Math.round((batteryBody as any).strokeWidth)
  ;(props.element as any).bodyRx = Math.round((batteryBody as any).rx)
  ;(props.element as any).bodyRy = Math.round((batteryBody as any).ry)

  ;(props.element as any).headWidth = Math.round((batteryHead as any).width)
  ;(props.element as any).headHeight = Math.round((batteryHead as any).height)
  ;(props.element as any).headFill = (batteryHead as any).fill
  ;(props.element as any).headRx = Math.round((batteryHead as any).rx)
  ;(props.element as any).headRy = Math.round((batteryHead as any).ry)

  // 计算内边距
  const padding = Math.round((batteryLevel as any).left - (batteryBody as any).left)
  ;(props.element as any).padding = padding

  // 计算电量百分比
  ;(props.element as any).level = (batteryLevel as any).width / ((batteryBody as any).width - padding * 2)

  // 计算头部间距
  const headGap = Math.round((batteryHead as any).left - ((batteryBody as any).left + (batteryBody as any).width))
  ;(props.element as any).headGap = headGap

  // 读取组上的颜色配置到单字段（仅当未设置时）
  if (group) {
    if ((props.element as any).levelColorLow == null) (props.element as any).levelColorLow = (group as any).levelColorLow || batteryStore.defaultLevelColorLow
    if ((props.element as any).levelColorMedium == null) (props.element as any).levelColorMedium = (group as any).levelColorMedium || batteryStore.defaultLevelColorMedium
    if ((props.element as any).levelColorHigh == null) (props.element as any).levelColorHigh = (group as any).levelColorHigh || batteryStore.defaultLevelColorHigh
  }
}

// 组件挂载时初始化属性（仅旧通道需要）
onMounted(() => {
  if (!props.applyPatch) {
    initElementProperties()
  }
})

// 更新元素
const updateElement = () => {
  // 新通道：优先使用 applyPatch 更新业务配置
  if (props.applyPatch && props.config) {
    props.applyPatch({
      width: currentModel.value.width,
      height: currentModel.value.height,
      padding: currentModel.value.padding,
      headGap: currentModel.value.headGap,
      bodyStroke: currentModel.value.bodyStroke,
      bodyFill: currentModel.value.bodyFill,
      bodyStrokeWidth: currentModel.value.bodyStrokeWidth,
      bodyRx: currentModel.value.bodyRx,
      bodyRy: currentModel.value.bodyRy,
      headWidth: currentModel.value.headWidth,
      headHeight: currentModel.value.headHeight,
      headFill: currentModel.value.headFill,
      headRx: currentModel.value.headRx,
      headRy: currentModel.value.headRy,
      level: currentModel.value.level,
      levelColorLow: currentModel.value.levelColorLow,
      levelColorMedium: currentModel.value.levelColorMedium,
      levelColorHigh: currentModel.value.levelColorHigh,
      headGap: currentModel.value.headGap,
    })
    return
  }

  if (!props.element) return

  // 旧通道：通过 elementManager.updateElement 下发补丁
  elementManager.updateElement(props.element as any, {
    width: (props.element as any).width,
    height: (props.element as any).height,
    bodyFill: (props.element as any).bodyFill,
    bodyStroke: (props.element as any).bodyStroke,
    bodyStrokeWidth: (props.element as any).bodyStrokeWidth,
    bodyRx: (props.element as any).bodyRx,
    bodyRy: (props.element as any).bodyRy,
    headWidth: (props.element as any).headWidth,
    headHeight: (props.element as any).headHeight,
    headFill: (props.element as any).headFill,
    headRx: (props.element as any).headRx,
    headRy: (props.element as any).headRy,
    padding: (props.element as any).padding,
    level: (props.element as any).level,
    levelColorLow: (props.element as any).levelColorLow,
    levelColorMedium: (props.element as any).levelColorMedium,
    levelColorHigh: (props.element as any).levelColorHigh,
    left: (props.element as any).left,
    top: (props.element as any).top,
    headGap: (props.element as any).headGap,
  })
}
</script>

<style scoped>
::v-deep(.el-collapse-item__wrap) {
  overflow: visible;
}

.battery-properties {
  padding: 16px;
}

.el-collapse-item {
  margin-bottom: 8px;
}

.el-form-item {
  margin-bottom: 16px;
}
</style>
