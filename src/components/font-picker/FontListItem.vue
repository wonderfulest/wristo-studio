<template>
  <div class="font-main">
    <div class="font-header" v-if="label || hasTags || (fontId != null && !isSystem)">
      <div class="font-name" v-if="label">{{ label }}</div>
      <div class="font-tags" v-if="hasTags">
        <el-tooltip v-if="isSystem" content="System Font" placement="top">
          <el-tag size="small" type="info">
            <el-icon><Monitor /></el-icon>
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
    <FontPreviewText :font-family="fontFamily" :type="type" :section-name="sectionName" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElTag } from 'element-plus'
import { Monitor, Delete } from '@element-plus/icons-vue'
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
}>()

const emit = defineEmits<{ (e: 'removed', id: number): void }>()

const hasTags = computed(() => props.isSystem || props.isMonospace || !!props.subfamily)

const onDelete = async () => {
  if (props.fontId == null) return
  try {
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
