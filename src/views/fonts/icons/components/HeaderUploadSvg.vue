<template>
  <div class="upload-wrap">
    <div class="hint">{{ t('icon.uploadHint') }}</div>
    <el-button v-if="canUsePremiumAssets" type="success" :loading="uploading" @click="dialogVisible = true">{{ t('icon.uploadSvg') }}</el-button>

    <el-dialog v-model="dialogVisible" :title="t('icon.uploadSvgTitle')" width="860px" :close-on-click-modal="false">
      <el-upload
        drag
        :show-file-list="false"
        :before-upload="beforeUpload"
        :http-request="doUpload"
        accept=".svg"
        multiple
        :disabled="uploading"
      >
        <div class="el-upload__text">
          <div>{{ t('icon.dragSvgTip') }}</div>
          <div>{{ t('icon.singleTypeTip') }}</div>
          <div>{{ t('icon.filenameMatchTip') }}</div>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            <div class="upload-extra">
              <div class="row">
                <span class="label"><span style="color:#f56c6c">*</span> {{ t('icon.displayTypeRequired') }}</span>
                <el-radio-group v-model="displayType">
                  <el-radio v-for="opt in displayTypeOptions" :key="opt.value" :label="opt.value">{{ opt.name || opt.value }}</el-radio>
                </el-radio-group>
              </div>
            </div>
            <div class="symbol-quick">
              <div class="symbol-selected">
                <span>{{ t('icon.selectedIconType') }}</span>
                <span class="code" v-if="selectedSymbolCode">{{ selectedSymbolCode }}</span>
                <span v-else>{{ t('icon.notSelected') }}</span>
                <el-button v-if="selectedSymbolCode" link type="primary" @click="clearSelect" :disabled="uploading">{{ t('icon.clearSelection') }}</el-button>
              </div>
              <div class="symbol-grid">
                <div
                  v-for="it in iconList"
                  :key="it.symbolCode"
                  class="symbol-card"
                  :class="{ active: selectedSymbolCode === it.symbolCode }"
                  @click="toggleSelect(it.symbolCode)"
                >
                  <div class="symbol-code">{{ it.symbolCode }}</div>
                  <div class="symbol-label">{{ it.label }}</div>
                  <div class="symbol-code">{{ it.iconUnicode }}</div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </el-upload>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false" :disabled="uploading">{{ t('common.close') }}</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { useStudioMembershipGate } from '@/composables/useStudioMembershipGate'
import { uploadIconSvg, listIconLibrary, type IconLibraryVO, type DisplayType } from '@/api/wristo/iconGlyph'
import { getEnumOptions, type EnumOption } from '@/api/common'
import { useI18n } from '@/i18n'

const { t } = useI18n()
const userStore = useUserStore()
const membershipGate = useStudioMembershipGate()
const canUsePremiumAssets = computed(() => userStore.canUsePremiumStudioAssets)

const props = defineProps<{ iconUnicode?: string }>()
const emit = defineEmits<{
  (e: 'uploaded'): void
  (e: 'update:iconUnicode', val?: string): void
}>()

const uploading = ref(false)
const dialogVisible = ref(false)
const iconList = ref<Pick<IconLibraryVO, 'symbolCode' | 'label' | 'iconUnicode'>[]>([])
const selectedSymbolCode = ref<string | undefined>(undefined)
const pendingIconUnicode = ref<string | undefined>(undefined)
const displayType = ref<DisplayType | undefined>(undefined)
const displayTypeOptions = ref<EnumOption[]>([])

watch(dialogVisible, async (v) => {
  if (v && !canUsePremiumAssets.value) {
    dialogVisible.value = false
    membershipGate.requirePremium('icon.premiumRequired')
    return
  }
  if (v && iconList.value.length === 0) {
    try {
      const resp = await listIconLibrary()
      const arr = (resp?.data || [])
        .map((it: any) => ({ symbolCode: it?.symbolCode, label: it?.label, iconUnicode: it?.iconUnicode }))
        .filter((it: any) => !!it.symbolCode)
      iconList.value = arr
    } catch {
      // silent
    }
  }
  if (v && displayTypeOptions.value.length === 0) {
    try {
      const res: any = await getEnumOptions('DisplayType')
      const list: EnumOption[] = res?.data ?? res ?? []
      displayTypeOptions.value = Array.isArray(list) && list.length ? list : [ { name: 'mip', value: 'mip' }, { name: 'amoled', value: 'amoled' } ]
    } catch {
      displayTypeOptions.value = [ { name: 'mip', value: 'mip' }, { name: 'amoled', value: 'amoled' } ]
    }
    // no default; user must select explicitly
  }
  // apply pending preselection if possible
  if (v && pendingIconUnicode.value && iconList.value.length) {
    const found = iconList.value.find(it => it.iconUnicode === pendingIconUnicode.value)
    if (found?.symbolCode) selectedSymbolCode.value = found.symbolCode
    pendingIconUnicode.value = undefined
  }
})

// react to prop change
watch(
  () => props.iconUnicode,
  (u) => {
    if (!u) {
      // clear selection only if not uploading
      if (!uploading.value) selectedSymbolCode.value = undefined
      pendingIconUnicode.value = undefined
      return
    }
    if (iconList.value.length > 0) {
      const found = iconList.value.find(it => it.iconUnicode === u)
      selectedSymbolCode.value = found?.symbolCode
      pendingIconUnicode.value = undefined
    } else {
      pendingIconUnicode.value = u
    }
  },
  { immediate: true }
)

const beforeUpload = (file: File) => {
  if (!canUsePremiumAssets.value) {
    membershipGate.requirePremium('icon.premiumRequired')
    return false
  }
  const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')
  if (!isSvg) {
    ElMessage.error(t('icon.uploadSvgOnly'))
    return false
  }
  return true
}

const doUpload = async (options: { file: File }) => {
  if (!canUsePremiumAssets.value) {
    membershipGate.requirePremium('icon.premiumRequired')
    return
  }
  const file = options.file
  if (!beforeUpload(file)) return
  if (!displayType.value) {
    ElMessage.error(t('icon.selectDisplayType'))
    return
  }
  uploading.value = true
  try {
    // Determine unicode: prefer selected icon; otherwise infer from file name by matching symbolCode
    const baseName = file.name.replace(/\.svg$/i, '')
    let unicode = ''
    if (selectedSymbolCode.value) {
      const found = iconList.value.find(it => it.symbolCode === selectedSymbolCode.value)
      unicode = found?.iconUnicode || ''
    } else {
      const foundByName = iconList.value.find(it => it.symbolCode === baseName)
      unicode = foundByName?.iconUnicode || ''
    }
    if (!unicode) {
      ElMessage.error(t('icon.resolveUnicodeFailed'))
      return
    }

    await uploadIconSvg(file, unicode, displayType.value)
    ElMessage.success(t('icon.uploadSuccess', { name: file.name }))
    emit('uploaded')
  } catch (e) {
    ElMessage.error(t('icon.uploadFailed', { name: file.name }))
  } finally {
    uploading.value = false
  }
}

function toggleSelect(code?: string) {
  if (uploading.value) return
  if (!code) {
    selectedSymbolCode.value = undefined
    emit('update:iconUnicode', undefined)
    return
  }
  selectedSymbolCode.value = selectedSymbolCode.value === code ? undefined : code
  // emit corresponding unicode to parent for syncing selection in IconAssets
  if (selectedSymbolCode.value) {
    const found = iconList.value.find(it => it.symbolCode === selectedSymbolCode.value)
    emit('update:iconUnicode', found?.iconUnicode)
  } else {
    emit('update:iconUnicode', undefined)
  }
}

function clearSelect() {
  if (uploading.value) return
  selectedSymbolCode.value = undefined
  emit('update:iconUnicode', undefined)
}
</script>

<style scoped>
.upload-wrap { display: flex; align-items: center; gap: 12px; }
.hint { font-size: 12px; color: var(--studio-text-muted); }
.symbol-quick { margin-top: 8px; }
.symbol-quick .label { font-size: 12px; color: var(--studio-text-subtle); margin-bottom: 6px; }
.symbol-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; }
.symbol-card { border: 1px solid var(--studio-border); border-radius: var(--studio-radius-sm); padding: 8px 10px; background: var(--studio-surface-soft); cursor: pointer; color: var(--studio-text); }
.symbol-card.active { border-color: var(--studio-primary); box-shadow: 0 0 0 1px var(--studio-primary) inset; background: var(--studio-primary-soft); }
.symbol-code { font-weight: 600; color: var(--studio-text); font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
.symbol-label { font-size: 12px; color: var(--studio-text-subtle); margin-top: 4px; }
</style>
