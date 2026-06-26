<template>
  <el-dialog v-model="visible" :title="t('elementSettings.changeBinding')" width="720px">
    <el-table :data="assets" v-loading="loading" height="420">
      <el-table-column :label="t('elementSettings.preview')" width="96">
        <template #default="{ row }">
          <img v-if="getAssetPreviewSource(row)" :src="getAssetPreviewSource(row)" alt="preview" class="asset-preview" />
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column prop="id" label="ID" width="120" />
      <el-table-column prop="format" :label="t('elementSettings.format')" width="120" />
      <el-table-column prop="displayType" :label="t('elementSettings.display')" width="120">
        <template #default="{ row }">
          {{ row.displayType || '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="author" :label="t('elementSettings.author')" />
      <el-table-column :label="t('elementSettings.action')" width="140" fixed="right">
        <template #default="{ row }">
          <el-button
            type="primary"
            size="small"
            :loading="loading"
            @click="handleConfirm(row.id)"
          >
            {{ t('elementSettings.choose') }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    <div class="pager">
      <el-pagination
        background
        layout="prev, pager, next"
        :current-page="page"
        :page-size="pageSize"
        :total="total"
        @current-change="onPageChange"
      />
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  pageIconAssets,
  bindAssetsToGlyph,
  type IconAssetPageQueryDTO,
  type IconAssetVO,
  type DisplayType,
} from '@/api/wristo/iconGlyph'
import { useI18n } from '@/i18n'

const props = defineProps<{
  modelValue: boolean
  iconId: number | null
  glyphId: number | null
  displayType: DisplayType
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'bound'): void
}>()
const { t } = useI18n()

const visible = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v),
})

const assets = ref<IconAssetVO[]>([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(100)
const total = ref(0)

function isSvgAsset(asset: IconAssetVO): boolean {
  const format = String(asset.format || '').toLowerCase()
  return format === 'svg' || Boolean(asset.svgContent) || /\.svg(?:$|\?)/i.test(asset.imageUrl || '')
}

function svgContentToDataUrl(svgContent?: string): string | undefined {
  const svg = svgContent?.trim()
  if (!svg) return undefined
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function getAssetSvgSource(asset: IconAssetVO): string | undefined {
  if (!isSvgAsset(asset)) return undefined
  return asset.imageUrl || svgContentToDataUrl(asset.svgContent)
}

function getAssetPreviewSource(asset: IconAssetVO): string | undefined {
  return getAssetSvgSource(asset) || asset.previewUrl || asset.imageUrl
}

const loadAssets = async () => {
  if (!props.iconId) {
    assets.value = []
    total.value = 0
    return
  }
  try {
    loading.value = true
    const dto: IconAssetPageQueryDTO = {
      pageNum: page.value,
      pageSize: pageSize.value,
      iconId: props.iconId ?? undefined,
      displayType: props.displayType,
      orderBy: 'id:desc',
    }
    const { data } = await pageIconAssets(dto)
    assets.value = data?.list ?? []
    total.value = data?.total ?? 0
  } finally {
    loading.value = false
  }
}

const onPageChange = async (p: number) => {
  page.value = p
  await loadAssets()
}

const handleConfirm = async (assetId: number) => {
  if (!props.glyphId || !assetId) return
  try {
    loading.value = true
    await bindAssetsToGlyph(props.glyphId, assetId)
    emit('update:modelValue', false)
    emit('bound')
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.modelValue, props.iconId, props.displayType] as const,
  async ([visible]) => {
    if (visible) {
      page.value = 1
      await loadAssets()
    }
  },
)
</script>

<style scoped>
.pager { display: flex; justify-content: center; padding: 8px 0; }
.asset-preview {
  width: 48px;
  height: 48px;
  object-fit: contain;
}
</style>
