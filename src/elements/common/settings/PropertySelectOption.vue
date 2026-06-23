<template>
  <div class="property-select-option">
    <div class="property-select-main">
      <span class="property-select-title" :title="title || propertyKey">{{ title || propertyKey }}</span>
      <span v-if="detail" class="property-select-detail" :title="detail">{{ detail }}</span>
    </div>
    <code class="property-select-key">{{ propertyKey }}</code>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title?: string
  detail?: string
  propertyKey: string
}>()
</script>

<style scoped>
.property-select-option {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(88px, 108px);
  align-items: center;
  gap: 12px;
  min-width: 0;
  width: 100%;
  padding: 4px 0;
}

.property-select-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.property-select-title {
  color: var(--el-text-color-primary);
  font-size: 13px;
  font-weight: 650;
  line-height: 1.25;
  white-space: normal;
  word-break: break-word;
}

.property-select-detail {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  font-weight: 400;
  line-height: 1.25;
  white-space: normal;
  word-break: break-word;
}

.property-select-key {
  justify-self: end;
  max-width: 108px;
  width: 100%;
  overflow: hidden;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
