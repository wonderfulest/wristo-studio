<template>
  <div class="settings-section">
    <el-form :model="currentModel" label-position="left" label-width="100px">
      <el-form-item :label="t('elementSettings.fontType')">
        <el-radio-group v-model="fontRenderType">
          <el-radio label="truetype">{{ t('elementSettings.trueTypeFont') }}</el-radio>
          <el-radio label="bitmap" :disabled="isHourFormat">
            {{ t('elementSettings.bitmapFont') }}
          </el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item :label="t('elementSettings.font')">
        <template v-if="fontRenderType === 'truetype'">
          <FontPicker 
            v-model="safeFontFamily" 
            :type="timeFontType"
            :types="timeFontTypes"
            :allow-any-language="true"
            @change="applyUpdate({ fontFamily: $event })" 
          />
        </template>
        <template v-else-if="fontRenderType === 'bitmap'">
          <BitmapFontPicker
            v-model="currentModel.bitmapFontId"
            @change="(fontId: number) => void handleBitmapFontChange(fontId)"
          />
        </template>
      </el-form-item>
      <el-form-item :label="t('elementSettings.fontSize')">
        <FontSizeSelect
          v-model="currentModel.fontSize"
          @change="(v: number) => applyUpdate({ fontSize: v })"
        />
      </el-form-item>
      <el-form-item v-if="fontRenderType === 'bitmap'" :label="t('elementSettings.fontGap')">
        <el-input-number
          v-model.number="currentModel.fontGap"
          :min="0"
          :max="100"
          @change="(v: number) => applyUpdate({ fontGap: v })"
        />
      </el-form-item>
      <el-form-item :label="t('elementSettings.alignment')">
        <AlignXButtons 
          :options="originXOptions"
          v-model="originXProxy"
        />
      </el-form-item>
      <el-form-item :label="t('elementSettings.fontColor')">
        <ColorPicker 
          v-model="currentModel.fill" 
          :property-key="currentModel.fillProperty"
          @property-change="applyUpdate({ fill: $event.color, fillProperty: $event.propertyKey })"
        />
      </el-form-item>
      <el-form-item :label="t('elementSettings.timeFormat')">
        <el-select 
          v-model.number="currentModel.formatter" 
          @change="handleFormatterChange"
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
import { originXOptions, TimeFormatConstants, TimeFormatOptions } from '@/config/settings'
import ColorPicker from '@/components/color-picker/index.vue'
import FontPicker from '@/components/font-picker/font-picker.vue'
import BitmapFontPicker from '@/components/font-picker/BitmapFontPicker.vue'
import AlignXButtons from '@/elements/common/settings/AlignXButtons.vue'
import FontSizeSelect from '@/elements/common/settings/FontSizeSelect.vue'
import { resolvePrimaryTimeFontType, resolveTimeFontTypes } from './timeFontTypes'
import { useI18n } from '@/i18n'

const props = defineProps<{
  config?: Record<string, any> | null
  applyPatch?: (patch: Record<string, any>) => void
}>()

const fontStore = useFontStore()
const { t } = useI18n()

// 只使用业务 config 作为当前模型
const currentModel = computed<any>(() => {
  return props.config ?? {}
})

const isHourFormat = computed(
  () => Number(currentModel.value.formatter) === TimeFormatConstants.HOUR_FORMAT,
)
const timeFontTypes = computed(() => resolveTimeFontTypes([currentModel.value.formatter]))
const timeFontType = computed(() => resolvePrimaryTimeFontType([currentModel.value.formatter]))

// 字体渲染类型：truetype / bitmap，默认 truetype
const fontRenderType = computed({
  get() {
    const v = (currentModel.value as any).fontRenderType
    return v === 'bitmap' ? v : 'truetype'
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
        void handleBitmapFontChange(existingBitmapId)
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

const handleFormatterChange = (formatter: number) => {
  if (formatter === TimeFormatConstants.HOUR_FORMAT) {
    const fontFamily = safeFontFamily.value || 'roboto-condensed-regular'
    ;(currentModel.value as any).fontRenderType = 'truetype'
    ;(currentModel.value as any).fontFamily = fontFamily
    applyUpdate({ formatter, fontRenderType: 'truetype', fontFamily })
    return
  }
  applyUpdate({ formatter })
}

const handleBitmapFontChange = async (fontId?: number | null) => {
  const requestedFontId = fontId ? Number(fontId) : null
  if (requestedFontId) {
    ;(currentModel.value as any).bitmapFontId = requestedFontId
    applyUpdate({ fontRenderType: 'bitmap', bitmapFontId: requestedFontId })
  } else {
    applyUpdate({ fontRenderType: 'bitmap' })
  }
}
</script>

<style scoped>
@import '@/assets/styles/settings.css';

.settings-section {
  padding: 16px;
}
</style>
