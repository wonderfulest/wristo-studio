<template>
  <el-dialog
    v-model="model"
    :title="t(isWeatherFont ? 'icon.createWeatherFont' : 'icon.createIconFont')"
    width="min(680px, calc(100vw - 32px))"
    class="icon-font-dialog"
  >
    <FontNamingBar
      ref="namingRef"
      type="icon"
      automatic
      @regenerate="generateAutomaticName"
    />
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" :loading="loading" @click="onConfirm">{{ t('common.create') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { IconGlyphCreateDTO } from '@/api/wristo/iconGlyph'
import FontNamingBar from '@/components/fonts/FontNamingBar.vue'
import { useI18n } from '@/i18n'
import { hasIconFontSlugConflict } from '../iconFontSlugAvailability'
import { generateSvgIconFontSlug } from '../iconFontName'

const { t } = useI18n()

const props = defineProps<{
  modelValue: boolean
  loading?: boolean
  form?: Partial<IconGlyphCreateDTO>
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', payload: IconGlyphCreateDTO): void
}>()

const model = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
})

const localForm = reactive<IconGlyphCreateDTO>({ glyphCode: '', style: '', fontType: 'icon_font', isDefault: 0, isActive: 1 })

const namingRef = ref<InstanceType<typeof FontNamingBar> | null>(null)
const checkingSlug = ref(false)

watch(() => props.form, (f) => {
  if (f) Object.assign(localForm, {
    glyphCode: f.glyphCode ?? '',
    style: f.style ?? '',
    fontType: f.fontType ?? 'icon_font',
    isDefault: 0,
    isActive: 1,
  })
}, { immediate: true })

const loading = computed(() => !!props.loading || checkingSlug.value)
const isWeatherFont = computed(() => props.form?.fontType === 'weather_font')
const automaticNameFailureKey = computed(() => isWeatherFont.value ? 'font.weatherNameGenerationFailed' : 'font.iconNameGenerationFailed')
const MAX_AUTOMATIC_NAME_ATTEMPTS = 10

const findAvailableName = async (): Promise<string> => {
  for (let attempt = 0; attempt < MAX_AUTOMATIC_NAME_ATTEMPTS; attempt += 1) {
    const candidate = generateSvgIconFontSlug(localForm.fontType || 'icon_font')
    if (!await hasIconFontSlugConflict(candidate)) return candidate
  }
  return ''
}

const generateAutomaticName = async () => {
  try {
    checkingSlug.value = true
    const candidate = await findAvailableName()
    if (!candidate) {
      ElMessage.error(t(automaticNameFailureKey.value))
      return
    }
    ;(namingRef.value as any)?.setName?.(candidate)
  } finally {
    checkingSlug.value = false
  }
}

watch(model, async (visible) => {
  if (!visible) return
  await nextTick()
  await generateAutomaticName()
})

const onConfirm = async () => {
  const naming = namingRef.value as any
  naming?.normalizeAllParts?.()
  const namingPayload = naming?.getNamingPayload?.()
  let code = String(namingPayload?.name || '')
  if (!code) {
    ElMessage.error(t('font.enterValidName'))
    return
  }

  try {
    checkingSlug.value = true
    if (await hasIconFontSlugConflict(code)) {
      code = await findAvailableName()
      if (!code) {
        ElMessage.error(t(automaticNameFailureKey.value))
        return
      }
      naming?.setName?.(code)
    }

    const payload: IconGlyphCreateDTO = {
      ...localForm,
      glyphCode: code,
      style: localForm.style,
    }

    emit('confirm', payload)
  } finally {
    checkingSlug.value = false
  }
}
</script>
