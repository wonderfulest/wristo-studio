<template>
  <el-dialog v-model="dialogVisible" :title="t('editor.keyboardMouseUsage')" width="1024px" :show-close="true" destroy-on-close @close="handleClose">
    <div class="dialog-content">
      <div class="shortcuts-section">
        <div class="section-header">
          <el-icon size="24">
            <Mouse />
          </el-icon>
          <span>{{ t('shortcuts.mouse') }}</span>
        </div>
        <table class="shortcuts-table">
          <tbody>
            <template v-for="group in mouseShortcutGroups" :key="group.title">
              <tr class="group-row">
                <th colspan="2">{{ group.title }}</th>
              </tr>
              <tr v-for="shortcut in group.shortcuts" :key="`${group.title}-${shortcut.action}`">
                <td class="action-cell">{{ shortcut.action }}</td>
                <td class="description-cell">{{ shortcut.description }}</td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
      <div class="shortcuts-section">
        <div class="section-header">
          <el-icon size="24">
            <Icon icon="material-symbols:keyboard" />
          </el-icon>
          <span>{{ t('shortcuts.keyboard') }}</span>
        </div>
        <table class="shortcuts-table">
          <tbody>
            <template v-for="group in keyboardShortcutGroups" :key="group.title">
              <tr class="group-row">
                <th colspan="2">{{ group.title }}</th>
              </tr>
              <tr v-for="shortcut in group.shortcuts" :key="`${group.title}-${shortcut.action}`">
                <td class="action-cell">{{ shortcut.action }}</td>
                <td class="description-cell">{{ shortcut.description }}</td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { Mouse } from '@element-plus/icons-vue'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const dialogVisible = ref(props.modelValue)

// 监听 modelValue 的变化
watch(
  () => props.modelValue,
  (newVal) => {
    dialogVisible.value = newVal
  }
)

// 监听 dialogVisible 的变化
watch(dialogVisible, (newVal) => {
  emit('update:modelValue', newVal)
})

const handleClose = () => {
  emit('update:modelValue', false)
}

const mouseShortcutGroups = computed(() => [
  {
    title: t('shortcuts.selection'),
    shortcuts: [
      { action: t('shortcuts.leftClickObject'), description: t('shortcuts.selectObject') },
      { action: t('shortcuts.shiftLeftClickObject'), description: t('shortcuts.toggleObjectSelection') },
      { action: t('shortcuts.leftClickLayerRow'), description: t('shortcuts.selectLayerObject') },
      { action: t('shortcuts.leftClickEmptyCanvas'), description: t('shortcuts.clearSelection') },
      { action: t('shortcuts.dragEmptyCanvas'), description: t('shortcuts.selectObjectsInRectangle') }
    ]
  },
  {
    title: t('shortcuts.transform'),
    shortcuts: [
      { action: t('shortcuts.dragSelectedObject'), description: t('shortcuts.moveSelectedObjects') },
      { action: t('shortcuts.dragCornerHandle'), description: t('shortcuts.scaleObjectProportionally') },
      { action: t('shortcuts.dragSideHandle'), description: t('shortcuts.resizeObject') }
    ]
  },
  {
    title: t('shortcuts.objectControls'),
    shortcuts: [
      { action: t('shortcuts.greenControlPoint'), description: t('shortcuts.duplicateObject') },
      { action: t('shortcuts.redControlPoint'), description: t('shortcuts.deleteObject') }
    ]
  },
  {
    title: t('shortcuts.canvas'),
    shortcuts: [
      { action: t('shortcuts.ctrlScrollWheel'), description: t('shortcuts.zoomInOrOut') },
      { action: t('shortcuts.doubleClickRuler'), description: t('shortcuts.addGuide') }
    ]
  }
])

const keyboardShortcutGroups = computed(() => [
  {
    title: t('shortcuts.selection'),
    shortcuts: [
      { action: t('shortcuts.arrowKeys'), description: t('shortcuts.moveByOnePx') },
      { action: t('shortcuts.shiftArrowKeys'), description: t('shortcuts.moveByTwoPx') },
      { action: t('shortcuts.deleteBackspace'), description: t('shortcuts.deleteUnlockedObjects') }
    ]
  },
  {
    title: t('shortcuts.edit'),
    shortcuts: [
      { action: t('shortcuts.copyKeys'), description: t('shortcuts.copySelectedObjects') },
      { action: t('shortcuts.pasteKeys'), description: t('shortcuts.pasteCopiedObjects') },
      { action: t('shortcuts.undoKeys'), description: t('shortcuts.undo') },
      { action: t('shortcuts.shiftUndoKeys'), description: t('shortcuts.redo') },
      { action: t('shortcuts.redoKeys'), description: t('shortcuts.redo') },
      { action: t('shortcuts.increaseFontSizeKeys'), description: t('shortcuts.increaseFontSize') },
      { action: t('shortcuts.decreaseFontSizeKeys'), description: t('shortcuts.decreaseFontSize') }
    ]
  },
  {
    title: t('shortcuts.panels'),
    shortcuts: [
      { action: t('shortcuts.openAppPropertiesKeys'), description: t('shortcuts.openAppProperties') },
      { action: t('shortcuts.openEditDesignKeys'), description: t('shortcuts.openEditDesignView') }
    ]
  }
])
</script>

<style scoped>
@import '@/assets/styles/dialog.scss';
.shortcuts-content {
  padding: 0px 20px;
}

.shortcuts-section {
  margin-bottom: 8px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  color: var(--el-text-color-primary);
  font-weight: 600;
}

.shortcuts-table {
  width: 100%;
  border-collapse: collapse;
}

.shortcuts-table tr {
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.shortcuts-table tr:last-child {
  border-bottom: none;
}

.group-row th {
  padding: 12px 12px 6px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0;
  text-align: left;
  text-transform: uppercase;
  background: var(--el-fill-color-light);
}

.action-cell {
  padding: 12px;
  width: 40%;
  color: var(--el-text-color-regular);
  font-family: monospace;
}

.description-cell {
  padding: 12px;
  color: var(--el-text-color-primary);
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  .shortcuts-table tr {
    border-color: var(--el-border-color-darker);
  }
}
</style>
