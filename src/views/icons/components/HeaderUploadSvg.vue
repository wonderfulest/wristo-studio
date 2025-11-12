<template>
  <div class="upload-wrap">
    <div class="hint">上传后的素材可在下方自定义字体时进行绑定</div>
    <el-button type="success" :loading="uploading" @click="dialogVisible = true">上传SVG</el-button>

    <el-dialog v-model="dialogVisible" title="上传 SVG" width="860px" :close-on-click-modal="false">
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
          <div>将 SVG 拖拽到此处，或点击选择，支持多文件</div>
          <div>1. 支持选择上传的图标，只能同时上传一种类型的图标</div>
          <div>2. 如果不选择，则上传文件名需要与 icon 的 Symbol Code 保持一致，比如 heart_rate.svg，可以同时上传多种类型的图标</div>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            <div class="upload-extra">
              <div class="row">
                <span class="label"><span style="color:#f56c6c">*</span> 显示类型（必选）：</span>
                <el-radio-group v-model="displayType">
                  <el-radio v-for="opt in displayTypeOptions" :key="opt.value" :label="opt.value">{{ opt.name || opt.value }}</el-radio>
                </el-radio-group>
              </div>
            </div>
            <div class="symbol-quick">
              <div class="symbol-selected">
                <span>已选择图标类型：</span>
                <span class="code" v-if="selectedSymbolCode">{{ selectedSymbolCode }}</span>
                <span v-else>未选择</span>
                <el-button v-if="selectedSymbolCode" link type="primary" @click="clearSelect" :disabled="uploading">清除选择</el-button>
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
          <el-button @click="dialogVisible = false" :disabled="uploading">关闭</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { uploadIconSvg, listIconLibrary, type IconLibraryVO, type DisplayType } from '@/api/wristo/iconGlyph'
import { getEnumOptions, type EnumOption } from '@/api/common'

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
  const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')
  if (!isSvg) {
    ElMessage.error('请上传 SVG 文件')
    return false
  }
  return true
}

const doUpload = async (options: { file: File }) => {
  const file = options.file
  if (!beforeUpload(file)) return
  if (!displayType.value) {
    ElMessage.error('请选择显示类型')
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
      ElMessage.error('未能确定上传图标的 unicode，请在上方选择图标类型，或确保文件名与 Symbol Code 一致')
      return
    }

    await uploadIconSvg(file, unicode, displayType.value)
    ElMessage.success(`${file.name} 上传成功`)
    emit('uploaded')
  } catch (e) {
    ElMessage.error(`${file.name} 上传失败`)
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
.hint { font-size: 12px; color: #606266; }
.symbol-quick { margin-top: 8px; }
.symbol-quick .label { font-size: 12px; color: #909399; margin-bottom: 6px; }
.symbol-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; }
.symbol-card { border: 1px solid #ebeef5; border-radius: 6px; padding: 8px 10px; background: #f9fafc; cursor: pointer; }
.symbol-card.active { border-color: #409eff; box-shadow: 0 0 0 1px #409eff inset; }
.symbol-code { font-weight: 600; color: #303133; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
.symbol-label { font-size: 12px; color: #909399; margin-top: 4px; }
</style>
