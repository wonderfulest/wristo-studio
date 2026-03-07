<template>
  <div class="settings-section">
    <el-form :model="currentModel" label-position="left" label-width="100px">
      <el-form-item label="Font Type">
        <el-radio-group v-model="fontRenderType">
          <el-radio label="truetype">truetype font</el-radio>
          <el-radio label="bitmap">bitmap font</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="Font">
        <template v-if="fontRenderType === 'truetype'">
          <font-picker 
            v-model="safeFontFamily" 
            :type="FontTypes.TEXT_FONT"
            @change="applyUpdate({ fontFamily: $event })" 
          />
        </template>
        <template v-else>
          <BitmapFontPicker
            v-model="currentModel.bitmapFontId"
            @change="applyUpdate({ fontRenderType: 'bitmap', bitmapFontId: $event })"
          />
        </template>
      </el-form-item>
      <el-form-item label="Font Size">
        <el-select
          v-model.number="currentModel.fontSize"
          @change="(v: number) => applyUpdate({ fontSize: v })"
        >
          <el-option v-for="size in fontSizes" :key="size" :label="`${size}px`" :value="size" />
        </el-select>
      </el-form-item>
      <el-form-item v-if="fontRenderType === 'bitmap'" label="Font Gap">
        <el-input-number
          v-model.number="currentModel.fontGap"
          :min="0"
          :max="100"
          @change="(v: number) => applyUpdate({ fontGap: v })"
        />
      </el-form-item>
      <el-form-item label="Alignment">
        <AlignXButtons 
          :options="originXOptions"
          v-model="originXProxy"
        />
      </el-form-item>
      <el-form-item label="Font Color">
        <color-picker 
          v-model="currentModel.fill" 
          @change="applyUpdate({ fill: $event })" 
        />
      </el-form-item>
      <el-form-item label="Time Format">
        <el-select 
          v-model.number="currentModel.formatter" 
          @change="(v: number) => applyUpdate({ formatter: v })"
        >
          <el-option 
            v-for="{ label, value, example } in TimeFormatOptions" 
            :key="value" 
            :label="label" 
            :value="value" 
            :title="'e.g.: ' + example"
          >
            {{ label }} - e.g.: {{ example }}
          </el-option>
        </el-select>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useFontStore } from '@/stores/fontStore'
import * as elementManager from '@/engine/managers/elementManager'
import { fontSizes, originXOptions, TimeFormatOptions } from '@/config/settings'
import ColorPicker from '@/components/color-picker/index.vue'
import FontPicker from '@/components/font-picker/font-picker.vue'
import BitmapFontPicker from '@/components/font-picker/BitmapFontPicker.vue'
import AlignXButtons from '@/elements/common/settings/AlignXButtons.vue'
import { FontTypes } from '@/constants/fonts'

const props = defineProps<{
  // 旧通道：直接传入 FabricElement
  element?: any
  // 新通道：业务配置 + 通用补丁函数
  config?: Record<string, any> | null
  applyPatch?: (patch: Record<string, any>) => void
}>()

const fontStore = useFontStore()

// 当前表单绑定的数据模型：优先使用业务 config，其次回退到 FabricElement
const currentModel = computed<any>(() => {
  return props.config ?? props.element ?? {}
})

// 字体渲染类型：truetype / bitmap，优先使用元素上已有配置，默认 truetype
const fontRenderType = computed({
  get() {
    const v = (currentModel.value as any).fontRenderType
    return v === 'bitmap' ? 'bitmap' : 'truetype'
  },
  set(v) {
    ;(currentModel.value as any).fontRenderType = v
    // 从 bitmap 切回 truetype 时，如果没有字体，给一个默认字体，并同步到画布
    if (v === 'truetype') {
      if (!(currentModel.value as any).fontFamily) {
        ;(currentModel.value as any).fontFamily = 'roboto-condensed-regular'
      }
      applyUpdate({ fontRenderType: 'truetype', fontFamily: (currentModel.value as any).fontFamily })
    } else {
      // 切到 bitmap 时：
      // 1) 如果已经有 bitmapFontId，则立刻触发 truetype->bitmap 的重建；
      // 2) 如果还没有 bitmapFontId，则先只切换模式，等待 BitmapFontPicker 选择后再重建。
      const existingBitmapId = (currentModel.value as any).bitmapFontId
      if (existingBitmapId) {
        applyUpdate({ fontRenderType: 'bitmap', bitmapFontId: existingBitmapId })
      } else {
        applyUpdate({ fontRenderType: 'bitmap' })
      }
    }
  },
})

// Alignment 的 originX 代理：提供默认值，避免向内部 el-select 传递 undefined
const originXProxy = computed<string>({
  get() {
    const v = (currentModel.value as any).originX
    // AlignXButtons / el-select 期望一个字符串值，这里默认 center
    return (v as string) || 'center'
  },
  set(v: string) {
    applyUpdate({ originX: v })
  },
})

// truetype 下使用的安全字体 family，避免传入 undefined
const safeFontFamily = computed({
  get() {
    return (currentModel.value as any).fontFamily || 'roboto-condensed-regular'
  },
  set(v: string) {
    ;(currentModel.value as any).fontFamily = v
  },
})

// 加载字体列表
onMounted(async () => {
  if (fontStore.fonts.length === 0) {
    await fontStore.fetchFonts()
  }
  // 如果有字体，预加载当前字体
  if (safeFontFamily.value) {
    await fontStore.loadFont(safeFontFamily.value)
  }
})

// 统一的更新方法：优先使用 applyPatch（更新 DataStore + Fabric），否则回退到 elementManager
const applyUpdate = (config: Record<string, any>) => {
  if (props.applyPatch && props.config) {
    props.applyPatch(config)
    return
  }

  if (props.element) {
    elementManager.updateElement(props.element as any, config)
  }
}
</script>

<style scoped>
@import '@/assets/styles/settings.css';

.settings-section {
  padding: 16px;
}
</style>
