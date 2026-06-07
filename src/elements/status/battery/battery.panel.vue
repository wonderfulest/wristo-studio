<template>
  <div class="battery-properties">
    <!-- 基础尺寸配置 -->
    <el-collapse v-model="activeNames">
      <el-collapse-item :title="t('elementSettings.basicSize')" name="size">
        <el-form label-position="left" label-width="100px">
          <el-form-item :label="t('elementSettings.width')">
            <el-input-number v-model="currentModel.width" :min="20" :max="500" @change="updateElement" />
          </el-form-item>
          <el-form-item :label="t('elementSettings.height')">
            <el-input-number v-model="currentModel.height" :min="10" :max="300" @change="updateElement" />
          </el-form-item>
          <el-form-item :label="t('elementSettings.padding')">
            <el-input-number v-model="currentModel.padding" :min="0" :max="20" @change="updateElement" />
          </el-form-item>
          <el-form-item :label="t('elementSettings.headGap')">
            <el-input-number v-model="currentModel.headGap" :min="0" :max="20" @change="updateElement" />
          </el-form-item>
        </el-form>
      </el-collapse-item>

      <!-- 电池主体样式 -->
      <el-collapse-item :title="t('elementSettings.bodyStyle')" name="body">
        <el-form label-position="left" label-width="100px">
          <el-form-item :label="t('elementSettings.borderColor')">
            <color-picker v-model="currentModel.bodyStroke" @change="updateElement" />
          </el-form-item>
          <el-form-item :label="t('elementSettings.fillColor')">
            <color-picker v-model="currentModel.bodyFill" @change="updateElement" />
          </el-form-item>
          <el-form-item :label="t('elementSettings.borderWidth')">
            <el-input-number v-model="currentModel.bodyStrokeWidth" :min="0" :max="10" @change="updateElement" />
          </el-form-item>
          <el-form-item :label="t('elementSettings.borderRadiusX')">
            <el-input-number v-model="currentModel.bodyRx" :min="0" :max="50" @change="updateElement" />
          </el-form-item>
          <el-form-item :label="t('elementSettings.borderRadiusY')">
            <el-input-number v-model="currentModel.bodyRy" :min="0" :max="50" @change="updateElement" />
          </el-form-item>
        </el-form>
      </el-collapse-item>

      <!-- 电池头部样式 -->
      <el-collapse-item :title="t('elementSettings.headStyle')" name="head">
        <el-form label-position="left" label-width="100px">
          <el-form-item :label="t('elementSettings.width')">
            <el-input-number v-model="currentModel.headWidth" :min="2" :max="50" @change="updateElement" />
          </el-form-item>
          <el-form-item :label="t('elementSettings.height')">
            <el-input-number v-model="currentModel.headHeight" :min="2" :max="100" @change="updateElement" />
          </el-form-item>
          <el-form-item :label="t('elementSettings.fillColor')">
            <color-picker v-model="currentModel.headFill" @change="updateElement" />
          </el-form-item>
          <el-form-item :label="t('elementSettings.borderRadiusX')">
            <el-input-number v-model="currentModel.headRx" :min="0" :max="20" @change="updateElement" />
          </el-form-item>
          <el-form-item :label="t('elementSettings.borderRadiusY')">
            <el-input-number v-model="currentModel.headRy" :min="0" :max="20" @change="updateElement" />
          </el-form-item>
        </el-form>
      </el-collapse-item>

      <!-- 电量显示样式 -->
      <el-collapse-item :title="t('elementSettings.levelStyle')" name="level">
        <el-form label-position="left" label-width="100px">
          <el-form-item :label="t('elementSettings.level')">
            <el-slider
              v-model="currentModel.level"
              :min="0"
              :max="1"
              :step="0.01"
              :format-tooltip="(val: number) => `${Math.round(val * 100)}%`"
              @change="updateElement"
            />
          </el-form-item>
          <el-form-item :label="t('elementSettings.lowBatteryColor')">
            <color-picker v-model="currentModel.levelColorLow" @change="updateElement" />
          </el-form-item>
          <el-form-item :label="t('elementSettings.mediumBatteryColor')">
            <color-picker v-model="currentModel.levelColorMedium" @change="updateElement" />
          </el-form-item>
          <el-form-item :label="t('elementSettings.highBatteryColor')">
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
import ColorPicker from '@/components/color-picker/index.vue'
import { DEFAULT_LEVEL_COLOR_HIGH, DEFAULT_LEVEL_COLOR_LOW, DEFAULT_LEVEL_COLOR_MEDIUM } from '@/elements/status/battery/battery.encoder'
import { useI18n } from '@/i18n'

const props = defineProps({
  element: {
    type: Object,
    required: false,
  },
  config: {
    type: Object,
    required: false,
  },
  applyPatch: {
    type: Function,
    required: false,
  },
})

const activeNames = ref(['size', 'body', 'head', 'level'])
const { t } = useI18n()

const currentModel = computed<any>(() => {
  return (props.config as any) ?? props.element ?? {}
})

if (!props.applyPatch && props.element) {
  const group = elementManager.getElementById((props.element as any).id) as any

  if ((props.element as any).levelColorLow == null) {
    ;(props.element as any).levelColorLow = (group as any)?.levelColorLow || DEFAULT_LEVEL_COLOR_LOW
  }
  if ((props.element as any).levelColorMedium == null) {
    ;(props.element as any).levelColorMedium = (group as any)?.levelColorMedium || DEFAULT_LEVEL_COLOR_MEDIUM
  }
  if ((props.element as any).levelColorHigh == null) {
    ;(props.element as any).levelColorHigh = (group as any)?.levelColorHigh || DEFAULT_LEVEL_COLOR_HIGH
  }
}

const initElementProperties = () => {
  if (!props.element) return

  const group = elementManager.getElementById((props.element as any).id) as any
  if (!group) return

  const batteryBody: any = (group as any)._body
  const batteryHead: any = (group as any)._head
  const batteryLevel: any = (group as any)._level

  if (!batteryBody || !batteryHead || !batteryLevel) return

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

  const padding = Math.round((batteryLevel as any).left - (batteryBody as any).left)
  ;(props.element as any).padding = padding

  ;(props.element as any).level = (batteryLevel as any).width / ((batteryBody as any).width - padding * 2)

  const headGap = Math.round((batteryHead as any).left - ((batteryBody as any).left + (batteryBody as any).width))
  ;(props.element as any).headGap = headGap

  if (group) {
    if ((props.element as any).levelColorLow == null) (props.element as any).levelColorLow = (group as any).levelColorLow || DEFAULT_LEVEL_COLOR_LOW
    if ((props.element as any).levelColorMedium == null) (props.element as any).levelColorMedium = (group as any).levelColorMedium || DEFAULT_LEVEL_COLOR_MEDIUM
    if ((props.element as any).levelColorHigh == null) (props.element as any).levelColorHigh = (group as any).levelColorHigh || DEFAULT_LEVEL_COLOR_HIGH
  }
}

onMounted(() => {
  if (!props.applyPatch) {
    initElementProperties()
  }
})

const updateElement = () => {
  if (props.applyPatch && props.config) {
    props.applyPatch({
      width: currentModel.value.width,
      height: currentModel.value.height,
      padding: currentModel.value.padding,
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
    })
    return
  }

  if (!props.element) return

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
