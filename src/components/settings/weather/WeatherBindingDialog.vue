<template>
  <el-dialog v-model="visible" title="Change Binding" width="720px">
    <el-table :data="assets" v-loading="loading" height="420">
      <el-table-column label="Preview" width="96">
        <template #default="{ row }">
          <img :src="row.previewUrl || row.imageUrl" alt="preview" style="width:48px;height:48px;object-fit:contain" />
        </template>
      </el-table-column>
      <el-table-column prop="id" label="ID" width="120" />
      <el-table-column prop="format" label="Format" width="120" />
      <el-table-column prop="displayType" label="Display" width="120">
        <template #default="{ row }">
          {{ row.displayType || '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="author" label="Author" />
      <el-table-column label="Action" width="140" fixed="right">
        <template #default="{ row }">
          <el-button
            type="primary"
            size="small"
            :loading="loading"
            @click="handleConfirm(row.id)"
          >
            Choose
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

const visible = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v),
})

const assets = ref<IconAssetVO[]>([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(100)
const total = ref(0)

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
</style>
