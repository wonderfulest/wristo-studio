<template>
  <div class="font-main" v-if="isReady">
    <div class="font-header" v-if="label || hasTags || (fontId != null && !isSystem)">
      <div class="font-name" v-if="label">{{ label }}</div>
      <div class="font-tags" v-if="hasTags">
        <el-tooltip v-if="isSystem" content="System Font" placement="top">
          <el-tag size="small" type="info" class="system-icon-tag">
            <i class="iconfont icon-system"></i>
          </el-tag>
        </el-tooltip>
        <!-- <el-tag v-if="isMonospace" size="small">
          <el-icon><Rank /></el-icon>
        </el-tag>
        <el-tag v-if="subfamily" size="small" effect="plain">
          <el-icon><CollectionTag /></el-icon>
        </el-tag> -->
      </div>
      <button
        v-if="fontId != null && !isSystem"
        type="button"
        class="font-delete"
        @click.stop="onDelete"
      >
        <el-icon><Delete /></el-icon>
      </button>
    </div>
    <FontPreviewText
      :font-family="fontFamily"
      :type="type"
      :section-name="sectionName"
      :font-url="fontUrl"
    />
  </div>
  <div v-else class="font-main">
    <div class="font-header">
      <div class="font-name">Loading...</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref, watch } from 'vue'
import { ElTag, ElMessageBox } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'
import FontPreviewText from './FontPreviewText.vue'
import { removeMyFont } from '@/api/wristo/fonts'

const props = defineProps<{
  label?: string
  fontFamily: string
  type?: string
  sectionName?: string
  isSystem?: boolean
  isMonospace?: boolean
  subfamily?: string
  fontId?: number
  fontUrl?: string
}>()

const emit = defineEmits<{ (e: 'removed', id: number): void }>()

const isReady = ref(false)

const hasTags = computed(() => props.isSystem || props.isMonospace || !!props.subfamily)

const loadFont = async (fontFamily: string | undefined) => {
  console.log('[FontListItem] loadFont', fontFamily)
  if (!fontFamily) {
    isReady.value = true
    return
  }

  isReady.value = false
  try {
    // Use FontFaceSet API when available to wait for font load
    const anyDoc = document as any
    if (anyDoc.fonts && typeof anyDoc.fonts.load === 'function' && fontFamily) {
      // use a generic font-size for measuring
      await anyDoc.fonts.load(`16px "${fontFamily}"`)
    }
  } catch (e) {
    // ignore font loading errors; fall back to showing item
    console.error('font load check failed', e)
  } finally {
    isReady.value = true
  }
}

onMounted(() => {
  loadFont(props.fontFamily)
})

watch(
  () => props.fontFamily,
  (newFont) => {
    loadFont(newFont)
  }
)

const onDelete = async () => {
  if (props.fontId == null) return
  try {
    await ElMessageBox({
      title: 'Delete Font',
      message: h('div', null, [
        h('p', null, 'Are you sure you want to delete this font?'),
        h(FontPreviewText, {
          fontFamily: props.fontFamily,
          type: props.type,
          sectionName: props.sectionName,
        }),
      ]),
      type: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
    })

    const resp = await removeMyFont(props.fontId)
    if (resp.code === 0 && resp.data) {
      emit('removed', props.fontId)
    }
  } catch (e) {
    // ignore errors here; parent can handle global errors if needed
    console.error('remove font failed', e)
  }
}
</script>

<style scoped>
.font-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.font-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.font-name {
  font-size: 12px;
  color: #909399;
}

.font-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.font-delete {
  margin-left: 8px;
  border: none;
  background: transparent;
  color: #f56c6c;
  font-size: 12px;
  cursor: pointer;
}

.font-delete:hover {
  text-decoration: underline;
}
</style>
