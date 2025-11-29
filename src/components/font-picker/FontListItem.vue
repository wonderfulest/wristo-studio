<template>
  <div class="font-main">
    <div class="font-header" v-if="label || hasTags">
      <div class="font-name" v-if="label">{{ label }}</div>
      <div class="font-tags" v-if="hasTags">
        <el-tag v-if="isSystem" size="small" type="info">
          <el-icon><Monitor /></el-icon>
        </el-tag>
        <el-tag v-if="isMonospace" size="small">
          <el-icon><Rank /></el-icon>
        </el-tag>
        <el-tag v-if="subfamily" size="small" effect="plain">
          <el-icon><CollectionTag /></el-icon>
        </el-tag>
      </div>
    </div>
    <FontPreviewText :font-family="fontFamily" :type="type" :section-name="sectionName" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElTag } from 'element-plus'
import { Monitor, Rank, CollectionTag } from '@element-plus/icons-vue'
import FontPreviewText from './FontPreviewText.vue'

const props = defineProps<{
  label?: string
  fontFamily: string
  type?: string
  sectionName?: string
  isSystem?: boolean
  isMonospace?: boolean
  subfamily?: string
}>()

const hasTags = computed(() => props.isSystem || props.isMonospace || !!props.subfamily)
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
</style>
