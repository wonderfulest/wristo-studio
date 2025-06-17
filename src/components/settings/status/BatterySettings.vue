<template>
  <div class="battery-properties">
    <!-- 基础尺寸配置 -->
    <el-collapse>
      <el-collapse-item title="基础尺寸" name="size">
        <el-form label-position="left" label-width="100px">
          <el-form-item label="宽度">
            <el-input-number v-model="element.width" :min="20" :max="500" @change="updateElement" />
          </el-form-item>
          <el-form-item label="高度">
            <el-input-number v-model="element.height" :min="10" :max="300" @change="updateElement" />
          </el-form-item>
          <el-form-item label="内边距">
            <el-input-number v-model="element.padding" :min="0" :max="20" @change="updateElement" />
          </el-form-item>
          <el-form-item label="头部间距">
            <el-input-number v-model="element.headGap" :min="0" :max="20" @change="updateElement" />
          </el-form-item>
        </el-form>
      </el-collapse-item>

      <!-- 电池主体样式 -->
      <el-collapse-item title="电池主体样式" name="body">
        <el-form label-position="left" label-width="100px">
          <el-form-item label="边框颜色">
            <color-picker v-model="element.bodyStroke" @change="updateElement" />
          </el-form-item>
          <el-form-item label="填充颜色">
            <color-picker v-model="element.bodyFill" @change="updateElement" />
          </el-form-item>
          <el-form-item label="边框宽度">
            <el-input-number v-model="element.bodyStrokeWidth" :min="0" :max="10" @change="updateElement" />
          </el-form-item>
          <el-form-item label="圆角半径X">
            <el-input-number v-model="element.bodyRx" :min="0" :max="50" @change="updateElement" />
          </el-form-item>
          <el-form-item label="圆角半径Y">
            <el-input-number v-model="element.bodyRy" :min="0" :max="50" @change="updateElement" />
          </el-form-item>
        </el-form>
      </el-collapse-item>

      <!-- 电池头部样式 -->
      <el-collapse-item title="电池头部样式" name="head">
        <el-form label-position="left" label-width="100px">
          <el-form-item label="宽度">
            <el-input-number v-model="element.headWidth" :min="2" :max="50" @change="updateElement" />
          </el-form-item>
          <el-form-item label="高度">
            <el-input-number v-model="element.headHeight" :min="2" :max="100" @change="updateElement" />
          </el-form-item>
          <el-form-item label="填充颜色">
            <color-picker v-model="element.headFill" @change="updateElement" />
          </el-form-item>
          <el-form-item label="圆角半径X">
            <el-input-number v-model="element.headRx" :min="0" :max="20" @change="updateElement" />
          </el-form-item>
          <el-form-item label="圆角半径Y">
            <el-input-number v-model="element.headRy" :min="0" :max="20" @change="updateElement" />
          </el-form-item>
        </el-form>
      </el-collapse-item>

      <!-- 电量显示样式 -->
      <el-collapse-item title="电量显示样式" name="level">
        <el-form label-position="left" label-width="100px">
          <el-form-item label="电量">
            <el-slider v-model="element.level" :min="0" :max="1" :step="0.01" :format-tooltip="(val) => `${Math.round(val * 100)}%`" @change="updateElement" />
          </el-form-item>
          <el-form-item label="低电量颜色（<20%）">
            <color-picker v-model="element.levelColors.low" @change="updateElement" />
          </el-form-item>
          <el-form-item label="中等电量颜色（20%-50%）">
            <color-picker v-model="element.levelColors.medium" @change="updateElement" />
          </el-form-item>
          <el-form-item label="高电量颜色（>50%）">
            <color-picker v-model="element.levelColors.high" @change="updateElement" />
          </el-form-item>
        </el-form>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useBatteryStore } from '@/stores/elements/status/batteryElement'
import ColorPicker from '@/components/color-picker/index.vue'

const props = defineProps({
  element: {
    type: Object,
    required: true
  }
})

const batteryStore = useBatteryStore()

// 确保 levelColors 对象存在
if (!props.element.levelColors) {
  props.element.levelColors = { ...batteryStore.defaultLevelColors }
}

// 从画布元素中获取实际属性值
const initElementProperties = () => {
  const group = batteryStore.baseStore.canvas.getObjects().find((obj) => obj.id === props.element.id)
  if (!group || !group.getObjects) return

  const objects = group.getObjects()
  const batteryBody = objects.find((obj) => obj.id.endsWith('_body'))
  const batteryHead = objects.find((obj) => obj.id.endsWith('_head'))
  const batteryLevel = objects.find((obj) => obj.id.endsWith('_level'))

  if (!batteryBody || !batteryHead || !batteryLevel) return

  // 更新所有属性值
  props.element.width = Math.round(batteryBody.width)
  props.element.height = Math.round(batteryBody.height)
  props.element.bodyFill = batteryBody.fill
  props.element.bodyStroke = batteryBody.stroke
  props.element.bodyStrokeWidth = Math.round(batteryBody.strokeWidth)
  props.element.bodyRx = Math.round(batteryBody.rx)
  props.element.bodyRy = Math.round(batteryBody.ry)

  props.element.headWidth = Math.round(batteryHead.width)
  props.element.headHeight = Math.round(batteryHead.height)
  props.element.headFill = batteryHead.fill
  props.element.headRx = Math.round(batteryHead.rx)
  props.element.headRy = Math.round(batteryHead.ry)

  // 计算内边距
  const padding = Math.round(batteryLevel.left - batteryBody.left)
  props.element.padding = padding

  // 计算电量百分比
  props.element.level = batteryLevel.width / (batteryBody.width - padding * 2)

  // 计算头部间距
  const headGap = Math.round(batteryHead.left - (batteryBody.left + batteryBody.width))
  props.element.headGap = headGap
}

// 组件挂载时初始化属性
onMounted(() => {
  initElementProperties()
})

// 指标组和符号的选项（这里需要根据实际情况配置）
const metricGroups = [
  { label: '系统', value: 'system' },
  { label: '活动', value: 'activity' }
  // ... 其他选项
]

const metricSymbols = [
  { label: '电池电量', value: 'battery' },
  { label: '充电状态', value: 'charging' }
  // ... 其他选项
]

// 更新元素
const updateElement = () => {
  // 更新画布上的元素
  batteryStore.updateElement(props.element, {
    width: props.element.width,
    height: props.element.height,
    bodyFill: props.element.bodyFill,
    bodyStroke: props.element.bodyStroke,
    bodyStrokeWidth: props.element.bodyStrokeWidth,
    bodyRx: props.element.bodyRx,
    bodyRy: props.element.bodyRy,
    headWidth: props.element.headWidth,
    headHeight: props.element.headHeight,
    headFill: props.element.headFill,
    headRx: props.element.headRx,
    headRy: props.element.headRy,
    padding: props.element.padding,
    level: props.element.level,
    levelColors: props.element.levelColors,
    left: props.element.left,
    top: props.element.top,
    headGap: props.element.headGap
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
