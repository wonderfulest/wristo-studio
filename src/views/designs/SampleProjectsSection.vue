<template>
  <div>
    <div class="page-header">
      <h2>Sample Projects</h2>
    </div>
    <el-row :gutter="24" class="design-grid">
      <el-col
        v-for="design in designs"
        :key="design.id"
        :xs="12"
        :sm="8"
        :md="6"
        :lg="4"
        :xl="3"
      >
        <div class="sample-card" @click="emit('select-template', design)">
          <div class="thumb-wrapper">
            <img
              class="thumb-image"
              :src="getDesignImageUrl(design)"
              :alt="design.name"
            />
          </div>
          <div class="sample-name" :title="design.name">
            {{ design.name }}
          </div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Design } from '@/types/api/design'
import { designApi } from '@/api/wristo/design'

const props = defineProps<{
  designs: Design[]
}>()

const emit = defineEmits<{
  (e: 'select-template', design: Design): void
}>()

const designs = computed(() => props.designs)

const getDesignImageUrl = (design: Design) => {
  return designApi.getDesignImageUrl(design, true) || ''
}
</script>

<style scoped>
.page-header {
  margin: 24px 0 8px;
}

.page-header h2 {
  margin: 0 0 4px;
}

.design-grid {
  margin-top: 16px;
}

.sample-card {
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.sample-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.thumb-wrapper {
  width: 100%;
  padding-top: 100%;
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  background: #f5f5f5;
}

.thumb-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sample-name {
  margin-top: 8px;
  font-size: 13px;
  color: #303133;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
