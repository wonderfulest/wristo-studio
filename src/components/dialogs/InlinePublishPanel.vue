<template>
  <section v-show="modelValue" class="inline-publish-panel" aria-label="Publishing information">
    <header><slot name="header" /></header>
    <slot />
    <footer><slot name="footer" /></footer>
  </section>
</template>
<script setup lang="ts">
defineProps<{ modelValue: boolean }>()
</script>
<style scoped>
.inline-publish-panel { padding: 24px; border: 1px solid var(--studio-border); border-radius: 12px; background: var(--studio-surface-raised); scroll-margin-top: 24px; }
header { margin-bottom: 22px; }
footer { position: sticky; bottom: 0; z-index: 2; margin: 24px -24px -24px; padding: 16px 24px; border-top: 1px solid var(--studio-border); border-radius: 0 0 12px 12px; background: var(--studio-surface-raised); }
.inline-publish-panel :deep(.el-form-item) { display: block; }
.inline-publish-panel :deep(.el-form-item__label) { display: block; width: auto !important; text-align: left; line-height: 1.6; height: auto; padding-bottom: 6px; }
.inline-publish-panel :deep(.el-form-item__content) { margin-left: 0 !important; min-width: 0; }
.inline-publish-panel :deep(.image-pair) { flex-wrap: wrap; }
.inline-publish-panel :deep(.el-input-group) { max-width: 100%; }
.inline-publish-panel :deep(.el-input-group__append) { gap: 8px; padding: 0 10px; }
.inline-publish-panel :deep(.el-input-group__append button.el-button) { margin: 0; padding: 0; }
.inline-publish-panel :deep(.publish-header) { padding-right: 0; }
.inline-publish-panel :deep(.dialog-footer) { display: flex; align-items: center; justify-content: space-between; gap: 18px; width: 100%; }
.inline-publish-panel :deep(.el-dialog__title) { font-size: 18px; font-weight: 600; color: var(--studio-text); }
.inline-publish-panel :deep(.go-live-form) { padding: 0; height: auto; overflow: visible; }
.inline-publish-panel :deep(.el-form-item) { margin-bottom: 24px; }
.inline-publish-panel :deep(.el-form-item__label) { color: var(--studio-text); font-size: 13px; font-weight: 500; padding-bottom: 8px; }
.inline-publish-panel :deep(.form-tip), .inline-publish-panel :deep(.form-tip-margin) { line-height: 1.6; margin-top: 6px; font-size: 11px; color: var(--studio-text-subtle); }
.inline-publish-panel :deep(.ai-credit-hint) { font-size: 11px; color: var(--studio-text-subtle); line-height: 1.6; padding: 10px 12px; margin: 0 0 22px; border-radius: 6px; background: var(--studio-surface-soft); }
.inline-publish-panel :deep(.publish-content-group > .el-form-item:last-child) { margin-bottom: 0; }
.inline-publish-panel :deep(.el-input__wrapper), .inline-publish-panel :deep(.el-textarea__inner) { border-radius: 7px; }
.inline-publish-panel :deep(.image-pair) { gap: 24px; }
@media(max-width: 720px) { .inline-publish-panel { padding: 18px; }footer { margin: 20px -18px -18px; padding: 14px 18px; }.inline-publish-panel :deep(.publish-save-note) { max-width: 180px; }.inline-publish-panel :deep(.publish-header) { align-items: flex-start; gap: 10px; } }

.inline-publish-panel :deep(.media-library) { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; }
.inline-publish-panel :deep(.media-library > .el-form-item) { min-width: 0; margin: 0; padding-bottom: 24px; border-bottom: 1px solid var(--studio-border); }
.inline-publish-panel :deep(.media-library > .el-form-item:nth-child(n+3)) { grid-column: 1 / -1; }
.inline-publish-panel :deep(.media-library > .el-form-item:last-child) { border-bottom: 0; padding-bottom: 0; }
.inline-publish-panel :deep(.media-library .el-form-item__label) { font-weight: 600; margin-bottom: 12px; padding: 0; }
.inline-publish-panel :deep(.media-library .image-pair) { gap: 12px; }
.inline-publish-panel :deep(.media-library .upload-title) { font-size: 12px; color: var(--studio-text-muted); }
.inline-publish-panel :deep(.media-library .images-row) { flex-wrap: wrap; overflow-x: visible; gap: 12px; }
.inline-publish-panel :deep(.media-library .image-wrapper) { background: var(--studio-surface-soft); border: 1px solid var(--studio-border); }
.inline-publish-panel :deep(.media-library .product-image-thumb) { object-fit: contain; padding: 6px; box-sizing: border-box; }
.inline-publish-panel :deep(.media-library .upload-card) { background: var(--studio-surface-soft); border-radius: 8px; box-sizing: border-box; }
.inline-publish-panel :deep(.media-library .image-wrapper:focus-within .delete-button) { opacity: 1; }
.inline-publish-panel :deep(.media-library > .media-primary-card) {
  padding: 18px;
  border: 1px solid var(--studio-border);
  border-radius: 12px;
  background: var(--studio-surface-soft);
}
.inline-publish-panel :deep(.media-primary-card > .el-form-item__label) {
  margin-bottom: 16px;
  font-size: 14px;
}
.inline-publish-panel :deep(.media-primary-card .image-pair) { gap: 16px; }
.inline-publish-panel :deep(.media-primary-card .image-upload-container) { gap: 8px; }
.inline-publish-panel :deep(.media-primary-card .upload-title-row) { line-height: 20px; gap: 6px; }
.inline-publish-panel :deep(.media-primary-card .box) {
  border-style: solid;
  border-radius: 10px;
  background: var(--studio-surface-raised);
}
.inline-publish-panel :deep(.media-primary-card .ratio-tip) {
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 10px;
}
.inline-publish-panel :deep(.media-banner-card .banner-container) {
  width: 100%;

}
.inline-publish-panel :deep(.media-banner-card .image-uploader .el-upload) { display: flex; width: 100%; }
.inline-publish-panel :deep(.media-banner-card .banner-area) {
  box-sizing: border-box;
  width: 100%;
  height: auto;
  aspect-ratio: 2 / 1;
  border-width: 1px;
  border-radius: 10px;
  background: var(--studio-surface-raised);
}
.inline-publish-panel :deep(.media-banner-card .banner-area:hover) {
  background: var(--studio-primary-soft);
  border-color: var(--studio-primary);
}
.inline-publish-panel :deep(.media-banner-card .upload-placeholder) { gap: 10px; font-size: 12px; line-height: 1.5; }
.inline-publish-panel :deep(.media-banner-card .upload-icon) {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--studio-primary-soft);
  color: var(--studio-primary);
  font-size: 20px;
}
@media (max-width: 1100px) { .inline-publish-panel :deep(.media-library) { grid-template-columns: minmax(0, 1fr); } }
</style>
