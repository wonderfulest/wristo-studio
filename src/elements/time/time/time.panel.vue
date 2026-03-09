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
          <FontPicker 
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
        <ColorPicker 
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
import { fontSizes, originXOptions, TimeFormatOptions } from '@/config/settings'
import ColorPicker from '@/components/color-picker/index.vue'
import FontPicker from '@/components/font-picker/font-picker.vue'
import BitmapFontPicker from '@/components/font-picker/BitmapFontPicker.vue'
import AlignXButtons from '@/elements/common/settings/AlignXButtons.vue'
import { FontTypes } from '@/config/fonts'

const props = defineProps<{
  config?: Record<string, any> | null
  applyPatch?: (patch: Record<string, any>) => void
}>()

const fontStore = useFontStore()

// 只使用业务 config 作为当前模型
const currentModel = computed<any>(() => {
  return props.config ?? {}
})

// 字体渲染类型：truetype / bitmap，默认 truetype
const fontRenderType = computed({
  get() {
    const v = (currentModel.value as any).fontRenderType
    return v === 'bitmap' ? 'bitmap' : 'truetype'
  },
  set(v) {
    ;(currentModel.value as any).fontRenderType = v
    if (v === 'truetype') {
      if (!(currentModel.value as any).fontFamily) {
        ;(currentModel.value as any).fontFamily = 'roboto-condensed-regular'
      }
      applyUpdate({ fontRenderType: 'truetype', fontFamily: (currentModel.value as any).fontFamily })
    } else {
      const existingBitmapId = (currentModel.value as any).bitmapFontId
      if (existingBitmapId) {
        applyUpdate({ fontRenderType: 'bitmap', bitmapFontId: existingBitmapId })
      } else {
        applyUpdate({ fontRenderType: 'bitmap' })
      }
    }
  },
})

// Alignment 的 originX 代理
const originXProxy = computed<string>({
  get() {
    const v = (currentModel.value as any).originX
    return (v as string) || 'center'
  },
  set(v: string) {
    applyUpdate({ originX: v })
  },
})

// truetype 下使用的安全字体 family
const safeFontFamily = computed({
  get() {
    return (currentModel.value as any).fontFamily || 'roboto-condensed-regular'
  },
  set(v: string) {
    ;(currentModel.value as any).fontFamily = v
  },
})

onMounted(async () => {
  if (fontStore.fonts.length === 0) {
    await fontStore.fetchFonts()
  }
  if (safeFontFamily.value) {
    await fontStore.loadFont(safeFontFamily.value)
  }
})

const applyUpdate = (patch: Record<string, any>) => {
  props.applyPatch?.(patch)
}
</script>

<style scoped>
@import '@/assets/styles/settings.css';

.settings-section {
  padding: 16px;
}
</style>
