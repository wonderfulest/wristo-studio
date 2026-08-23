<template>
  <el-dialog
    :model-value="visible"
    append-to-body
    width="420px"
    :title="translate('asset.sharingDecisionTitle')"
    :show-close="false"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
  >
    <p class="sharing-decision-copy">{{ translate('asset.sharingDecisionHint') }}</p>
    <label class="remember-sharing-choice">
      <input
        data-test="remember-sharing-choice"
        type="checkbox"
        :checked="remember"
        :disabled="saving"
        @change="emit('update:remember', ($event.target as HTMLInputElement).checked)"
      />
      <span>{{ translate('asset.rememberSharingChoice') }}</span>
    </label>

    <template #footer>
      <div class="sharing-decision-actions">
        <el-button
          data-test="keep-private"
          :disabled="saving"
          @click="emit('choose', false)"
        >
          {{ translate('asset.keepUploadPrivate') }}
        </el-button>
        <el-button
          data-test="share-upload"
          type="primary"
          :loading="saving"
          @click="emit('choose', true)"
        >
          {{ translate('asset.shareUpload') }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'

type Translate = (key: string, params?: Record<string, string | number>) => string

defineProps({
  visible: { type: Boolean, required: true },
  remember: { type: Boolean, required: true },
  saving: { type: Boolean, required: true },
  translate: { type: Function as PropType<Translate>, required: true },
})

const emit = defineEmits<{
  (event: 'choose', isShared: boolean): void
  (event: 'update:remember', remember: boolean): void
}>()
</script>

<style scoped>
.sharing-decision-copy {
  margin: 0 0 18px;
  color: var(--studio-text-muted);
  font-size: 13px;
  line-height: 1.55;
}

.remember-sharing-choice {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--studio-text);
  font-size: 13px;
  cursor: pointer;
}

.remember-sharing-choice input {
  width: 16px;
  height: 16px;
  margin: 0;
  accent-color: var(--studio-primary);
}

.sharing-decision-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
