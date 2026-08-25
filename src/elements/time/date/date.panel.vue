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
        <el-select v-model="currentModel.dateFormatMode" @change="handleFormatModeChange">
          <el-option :label="t('elementSettings.dateFormatPreset')" value="preset" />
          <el-option :label="t('elementSettings.dateFormatCustomToken')" value="custom" />
        </el-select>
      </el-form-item>

      <DatePropertyField
        v-if="currentModel.dateFormatMode !== 'custom'"
        v-model="currentModel.dateProperty"
        @change="handleDatePropertyChange"
      />
      <el-form-item v-else class="token-template-field">
        <template #label>
          <div class="date-template-label">
            <span>{{ t('elementSettings.dateTokenTemplate') }}</span>
            <el-button
              class="date-template-random"
              size="small"
              text
              type="primary"
              @click="handleRandomDateTemplate"
            >
              {{ t('elementSettings.dateTokenRandom') }}
            </el-button>
          </div>
        </template>
        <TextTemplateEditor
          :model-value="currentModel.dateTemplate || DEFAULT_DATE_TEMPLATE"
          :allowed-variables="dateTemplateVariables"
          :template-error="dateTemplateError"
          :helper-text="t('elementSettings.dateTokenHelper')"
          @update:model-value="handleDateTemplateChange"
        />
        <a
          class="date-token-guide"
          href="https://studio.wristo.io/tokens"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ t('elementSettings.dateTokenGuide') }} wristo.io/tokens
        </a>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useFontStore } from '@/stores/fontStore'
import { useDesignStore } from '@/stores/designStore'
import { usePropertiesStore } from '@/stores/properties'
import { originXOptions } from '@/config/settings'
import ColorPicker from '@/components/color-picker/index.vue'
import FontPicker from '@/components/font-picker/font-picker.vue'
import AlignXButtons from '@/elements/common/settings/AlignXButtons.vue'
import FontSizeSelect from '@/elements/common/settings/FontSizeSelect.vue'
import DatePropertyField from '@/elements/common/settings/DatePropertyField.vue'
import TextTemplateEditor from '@/components/properties/common/TextTemplateEditor.vue'
import { useI18n } from '@/i18n'
import { getFontBySlug } from '@/api/wristo/fonts'
import { canonicalFontSlug } from '@/features/bitmap-font-maker/fontSlug'
import {
  getDateFontRequirementLabel,
  isFontCompatibleWithDateLanguage,
} from '@/utils/dateFontCompatibility'
import type { FontItem } from '@/types/font-picker'
import type { DesignFontVO } from '@/types/font'
import { resolveDesignContentLanguage } from '@/utils/effectiveDisplayLocale'
import { resolveDatePropertyConfig } from '@/engine/services/datePropertyConfig'
import {
  createRandomDateTemplate,
  DEFAULT_DATE_TEMPLATE,
  validateCustomDateTemplate,
} from './dateTemplate'
import { DEFAULT_EXPRESSION_TOKEN_CATALOG } from '@/engine/expression/tokenCatalog'

const props = defineProps<{
  config?: Record<string, any> | null
  applyPatch?: (patch: Record<string, any>) => void
}>()

const fontStore = useFontStore()
const designStore = useDesignStore()
const propertiesStore = usePropertiesStore()
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

const currentDateLanguage = computed(() => resolveDesignContentLanguage(designStore))
const getFontCompatibilityNotice = (fontFamily: string, language = currentDateLanguage.value) => {
  if (!fontFamily) return ''
  const font = findKnownFont(fontFamily)
  if (!font) return ''
  if (isFontCompatibleWithDateLanguage(font, language)) return ''
  return `This date format requires a ${getDateFontRequirementLabel(language)}. Please choose a compatible font.`
}

const fontCompatibilityNotice = computed(() => getFontCompatibilityNotice(String(currentModel.value.fontFamily || '')))
const dateTemplateVariables = computed(() => DEFAULT_EXPRESSION_TOKEN_CATALOG.definitions
  .filter((definition) => definition.code.startsWith('dt')
    || definition.code.startsWith('cn')
  )
  .map((definition) => definition.code))
const dateTemplateError = computed(() => validateCustomDateTemplate(currentModel.value.dateTemplate || DEFAULT_DATE_TEMPLATE)[0] || '')

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

const handleDatePropertyChange = async (dateProperty: string) => {
  const resolved = resolveDatePropertyConfig(
    { ...currentModel.value, dateProperty },
    propertiesStore.allProperties,
  )
  applyUpdate(resolved)
  await warnIfFontIncompatible(String(currentModel.value.fontFamily || ''))
}

const handleFormatModeChange = (dateFormatMode: 'preset' | 'custom') => {
  applyUpdate({
    dateFormatMode,
    ...(dateFormatMode === 'custom' ? { dateProperty: '' } : {}),
    ...(dateFormatMode === 'custom' && !currentModel.value.dateTemplate
      ? { dateTemplate: DEFAULT_DATE_TEMPLATE }
      : {}),
  })
}

const handleDateTemplateChange = (dateTemplate: string) => {
  applyUpdate({ dateFormatMode: 'custom', dateTemplate })
}

const handleRandomDateTemplate = () => {
  applyUpdate({
    dateFormatMode: 'custom',
    dateTemplate: createRandomDateTemplate(currentModel.value.dateTemplate || DEFAULT_DATE_TEMPLATE),
  })
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

.token-template-field :deep(.el-form-item__content) {
  display: block;
}

.date-template-label {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
}

.date-template-random {
  min-height: 24px;
  padding: 2px 6px;
}

.date-token-guide {
  display: inline-block;
  margin-top: 8px;
  color: var(--el-color-primary);
  font-size: 12px;
  line-height: 1.4;
  text-decoration: none;
}

.date-token-guide:hover {
  text-decoration: underline;
}
</style>
