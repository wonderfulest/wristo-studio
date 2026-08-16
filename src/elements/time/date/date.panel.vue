<template>
  <div class="settings-section">
    <el-form :model="currentModel" label-position="left" label-width="100px">
      <el-form-item :label="t('elementSettings.fontSize')">
        <FontSizeSelect
          v-model="currentModel.fontSize"
          @change="(v: number) => applyUpdate({ fontSize: v })"
        />
      </el-form-item>

      <el-form-item :label="t('elementSettings.fontColor')">
        <ColorPicker
          v-model="currentModel.fill"
          :property-key="currentModel.fillProperty"
          @property-change="applyUpdate({ fill: $event.color, fillProperty: $event.propertyKey })"
        />
      </el-form-item>

      <el-form-item :label="t('elementSettings.font')">
        <FontPicker
          v-model="currentModel.fontFamily"
          type=""
          :exclude-icon-fonts="true"
          :date-content-language="currentDateLanguage"
          @change="handleFontChange"
        />
        <div v-if="fontCompatibilityNotice" class="field-warning">
          {{ fontCompatibilityNotice }}
        </div>
      </el-form-item>

      <el-form-item :label="t('elementSettings.alignment')">
        <AlignXButtons
          :options="originXOptions"
          v-model="originXProxy"
        />
      </el-form-item>

      <el-form-item :label="t('elementSettings.dateFormat')">
        <el-select
          v-model.number="currentModel.formatter"
          @change="handleFormatterChange"
        >
          <el-option
            v-for="option in availableDateFormatOptions"
            :key="option.value"
            :label="getDateFormatOptionLabel(option)"
            :value="option.value"
            :title="'e.g.: ' + option.example"
          >
            {{ getDateFormatOptionLabel(option) }} - e.g.: {{ option.example }}
          </el-option>
        </el-select>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useFontStore } from '@/stores/fontStore'
import { useDesignStore } from '@/stores/designStore'
import { originXOptions, DateFormatOptions } from '@/config/settings'
import ColorPicker from '@/components/color-picker/index.vue'
import FontPicker from '@/components/font-picker/font-picker.vue'
import AlignXButtons from '@/elements/common/settings/AlignXButtons.vue'
import FontSizeSelect from '@/elements/common/settings/FontSizeSelect.vue'
import { useI18n } from '@/i18n'
import { getFontBySlug } from '@/api/wristo/fonts'
import { canonicalFontSlug } from '@/features/bitmap-font-maker/fontSlug'
import {
  getDateFontRequirementLabel,
  isFontCompatibleWithDateLanguage,
} from '@/utils/dateFontCompatibility'
import type { OptionFormat } from '@/types/settings'
import type { FontItem } from '@/types/font-picker'
import type { DesignFontVO } from '@/types/font'
import { getAllowedDateFormatters } from '@/domain/designLanguageCapabilities'
import { resolveDesignContentLanguage } from '@/utils/effectiveDisplayLocale'

const props = defineProps<{
  config?: Record<string, any> | null
  applyPatch?: (patch: Record<string, any>) => void
}>()

const fontStore = useFontStore()
const designStore = useDesignStore()
const { t } = useI18n()

const currentModel = computed<any>(() => {
  return props.config ?? {}
})

const originXProxy = computed<string>({
  get() {
    const v = (currentModel.value as any).originX
    return (v as string) || 'center'
  },
  set(v: string) {
    applyUpdate({ originX: v })
  },
})

const availableDateFormatOptions = computed(() => {
  const allowed = new Set(getAllowedDateFormatters(designStore.appLanguage))
  return DateFormatOptions.filter((option) => allowed.has(option.value))
})

const getDateFormatOptionLabel = (option: OptionFormat<number>) => {
  return designStore.appLanguage === 'zhs' ? option.zhsLabel : option.label
}

const currentDateLanguage = computed(() => resolveDesignContentLanguage(designStore))
const getFontCompatibilityNotice = (fontFamily: string, language = currentDateLanguage.value) => {
  if (!fontFamily) return ''
  const font = findKnownFont(fontFamily)
  if (!font) return ''
  if (isFontCompatibleWithDateLanguage(font, language)) return ''
  return `This date format requires a ${getDateFontRequirementLabel(language)}. Please choose a compatible font.`
}

const fontCompatibilityNotice = computed(() => getFontCompatibilityNotice(String(currentModel.value.fontFamily || '')))

onMounted(async () => {
  if (fontStore.fonts.length === 0) {
    await fontStore.fetchFonts()
  }
  const family = (currentModel.value as any).fontFamily
  if (family) {
    await fontStore.loadFont(family)
  }
})

const applyUpdate = (patch: Record<string, any>) => {
  props.applyPatch?.(patch)
}

const findKnownFont = (slug: string): (FontItem | DesignFontVO) | null => {
  const allFonts = [
    ...(fontStore.allFonts as FontItem[]),
    ...(fontStore.recentFonts as FontItem[]),
  ]
  const local = allFonts.find((font) => font.value === slug)
  if (local) return local
  return fontStore.serverFonts.get(canonicalFontSlug(slug)) || null
}

const loadFontMetadata = async (slug: string): Promise<FontItem | DesignFontVO | null> => {
  const known = findKnownFont(slug)
  if (known) return known
  try {
    const res = await getFontBySlug(slug)
    if (res.data) {
      fontStore.serverFonts.set(canonicalFontSlug(slug), res.data)
      return res.data
    }
  } catch {}
  return null
}

const warnIfFontIncompatible = async (
  fontFamily: string,
  language = currentDateLanguage.value,
) => {
  if (!fontFamily) return
  const font = await loadFontMetadata(fontFamily)
  if (!font) return
  if (isFontCompatibleWithDateLanguage(font, language)) return
  ElMessage.warning(`This date format requires a ${getDateFontRequirementLabel(language)}. Please choose a compatible font.`)
}

const handleFormatterChange = async (formatter: number) => {
  applyUpdate({ formatter })
  await warnIfFontIncompatible(String(currentModel.value.fontFamily || ''))
}

const handleFontChange = async (fontFamily: string) => {
  applyUpdate({ fontFamily })
  await warnIfFontIncompatible(fontFamily)
}
</script>

<style scoped>
@import '@/assets/styles/settings.css';

.settings-section {
  padding: 16px;
}

.field-warning {
  margin-top: 6px;
  color: var(--el-color-warning);
  font-size: 12px;
  line-height: 1.4;
}
</style>
