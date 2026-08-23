<template>
  <el-sub-menu
    index="image"
    popper-class="app-menu-dropdown app-menu-rich-dropdown app-menu-image-dropdown"
    :popper-offset="8"
  >
    <template #title>
      <el-icon><Picture /></el-icon>
      <span>{{ t('editor.image') }}</span>
    </template>
    <div class="menu-group menu-group--image">
      <div class="menu-group-title">
        <el-icon><Picture /></el-icon>
        <span>{{ t('editor.image') }}</span>
      </div>
      <el-menu-item index="image/image" @click="onAddElement('image', 'image')">
        <el-icon><Picture /></el-icon>
        <span>{{ t('editor.image') }}</span>
      </el-menu-item>
      <el-menu-item index="image/mask" @click="onAddElement('image', 'image', { assetType: 'mask' })">
        <el-icon><Icon icon="mdi:gradient-horizontal" /></el-icon>
        <span>{{ t('editor.mask') }}</span>
      </el-menu-item>
      <el-menu-item index="image/dynamic-image" @click="onAddElement('decoration', 'dynamicImage')">
        <el-icon><Icon icon="mdi:image-sync" /></el-icon>
        <span>{{ t('dynamicImage.title') }}</span>
      </el-menu-item>
    </div>
  </el-sub-menu>
</template>

<script setup>
import { Picture } from '@element-plus/icons-vue'
import { Icon } from '@iconify/vue'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const emit = defineEmits(['add-element'])

const onAddElement = (category, elementType, overrides = {}) => {
  emit('add-element', category, elementType, overrides)
}
</script>
