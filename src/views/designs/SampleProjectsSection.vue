<template>
  <div>
    <div class="page-header">
      <h2>{{ t('project.sampleProjects') }}</h2>
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
import { useI18n } from '@/i18n'

const { t } = useI18n()

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
  margin: 0 0 6px;
}

.page-header h2 {
  margin: 0 0 4px;
  color: var(--studio-text);
  font-size: 24px;
  font-weight: 800;
}

.design-grid {
  margin-top: 10px;
  row-gap: 18px;
}

.sample-card {
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-lg);
  background: var(--studio-surface);
  box-shadow: var(--studio-shadow-sm);
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.sample-card:hover {
  transform: translateY(-2px);
  border-color: var(--studio-primary);
  box-shadow: var(--studio-shadow-md);
}

.thumb-wrapper {
  width: 100%;
  padding-top: 100%;
  position: relative;
  border-radius: var(--studio-radius-lg);
  overflow: hidden;
  background: var(--studio-surface-soft);
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.05);
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
  color: var(--studio-text);
  text-align: center;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
