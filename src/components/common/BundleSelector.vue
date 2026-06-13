<template>
  <div class="bundle-selector">
    <el-form-item :label="t('bundle.bundles')">
      <el-select
        v-model="localBundleIds"
        multiple
        filterable
        :placeholder="t('bundle.selectBundles')"
        :loading="loadingBundles"
        :disabled="true"
        style="width: 100%"
      >
        <el-option
          v-for="bundle in bundles"
          :key="bundle.bundleId"
          :label="bundle.bundleName"
          :value="bundle.bundleId"
        />
      </el-select>
      <div class="form-tip">
        {{ t('bundle.tip') }}
      </div>
    </el-form-item>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Bundle } from '@/types/api/bundle'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const props = withDefaults(defineProps<{
  bundleIds: number[]
  bundles: Bundle[]
  loadingBundles?: boolean
}>(), {
  bundleIds: () => [],
  bundles: () => [],
  loadingBundles: false
})

const emit = defineEmits<{
  (e: 'update:bundleIds', val: number[]): void
}>()

const localBundleIds = computed({
  get: () => props.bundleIds,
  set: (val: number[]) => emit('update:bundleIds', val)
})
</script>

<style scoped>
.form-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
