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
      <div class="font-actions" v-if="!isSystem">
        <button
          v-if="isIcon"
          type="button"
          class="font-edit"
          @click.stop="onEditIcon"
        >
          <el-icon><Edit /></el-icon>
        </button>
        <button
          v-if="fontId != null"
          type="button"
          class="font-delete"
          @click.stop="onDelete"
        >
          <el-icon><Delete /></el-icon>
        </button>
      </div>
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
import { useRouter } from 'vue-router'
import { ElTag, ElMessageBox } from 'element-plus'
import { Edit, Delete } from '@element-plus/icons-vue'
import FontPreviewText from '@/components/fonts/FontPreviewText.vue'
import { removeMyFont } from '@/api/wristo/fonts'
import { FontTypes } from '@/constants/fonts'
import { useFontStore } from '@/stores/fontStore'

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

const router = useRouter()
const fontStore = useFontStore()

const isIcon = computed(() => props.type === FontTypes.ICON_FONT || props.sectionName === 'icon')

const hasTags = computed(() => props.isSystem || props.isMonospace || !!props.subfamily)

const loadFont = async (slug: string | undefined, url?: string) => {
  console.log('[FontListItem] loadFont via store', slug, url)
  if (!slug) {
    isReady.value = true
    return
  }

  isReady.value = false
  try {
    await fontStore.loadFont(slug, url)
  } catch (e) {
    console.error('fontStore.loadFont failed', e)
  } finally {
    isReady.value = true
  }
}

onMounted(() => {
  loadFont(props.fontFamily, props.fontUrl)
})

watch(
  () => [props.fontFamily, props.fontUrl],
  ([newSlug, newUrl]) => {
    loadFont(newSlug, newUrl)
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

const onEditIcon = () => {
  // Use glyphCode to open the corresponding tab in IconLibrary.
  // For icon fonts, the glyphCode is encoded in the font family name.
  router.push({
    path: '/icon-library',
    query: {
      glyphCode: props.fontFamily,
    },
  })
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

.font-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.font-delete {
  border: none;
  background: transparent;
  color: #f56c6c;
  font-size: 12px;
  cursor: pointer;
}

.font-edit {
  border: none;
  background: transparent;
  color: #409eff;
  font-size: 12px;
  cursor: pointer;
}

.font-delete:hover {
  text-decoration: underline;
}
</style>
