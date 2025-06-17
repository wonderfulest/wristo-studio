<template>
    <el-dialog v-model="dialogVisible" title="Keyboard/Mouse Usage" width="1024px" :show-close="true" destroy-on-close
        @close="handleClose">
        <div class="dialog-content">
            <div class="shortcuts-section">
                <div class="section-icon">
                    <el-icon size="24">
                        <Mouse />
                    </el-icon>
                </div>
                <table class="shortcuts-table">
                    <tbody>
                        <tr v-for="(shortcut, index) in mouseShortcuts" :key="index">
                            <td class="action-cell">{{ shortcut.action }}</td>
                            <td class="description-cell">{{ shortcut.description }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div class="shortcuts-section">
                <div class="section-icon">
                    <el-icon size="24">
                        <Icon icon="material-symbols:keyboard" />
                    </el-icon>
                </div>
                <table class="shortcuts-table">
                    <tbody>
                        <tr v-for="(shortcut, index) in keyboardShortcuts" :key="index">
                            <td class="action-cell">{{ shortcut.action }}</td>
                            <td class="description-cell">{{ shortcut.description }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Mouse } from '@element-plus/icons-vue'

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false
    }
})

const emit = defineEmits(['update:modelValue'])

const dialogVisible = ref(props.modelValue)

// 监听 modelValue 的变化
watch(() => props.modelValue, (newVal) => {
    dialogVisible.value = newVal
})

// 监听 dialogVisible 的变化
watch(dialogVisible, (newVal) => {
    emit('update:modelValue', newVal)
})

const handleClose = () => {
    emit('update:modelValue', false)
}

const mouseShortcuts = [
    { action: 'left click on object', description: 'Select object' },
    { action: 'ctrl + left click on object', description: 'Select/deselect multiple objects' },
    { action: 'left click on the object list item', description: 'Select item (object)' },
    { action: 'ctrl + left click on object list item', description: 'add item (object) into selection' },
    { action: 'shift + left click on object list item', description: 'Select all items (objects) between two items' },
    { action: 'alt + left click on object', description: 'clone object' },
    { action: 'shift + mouse drag', description: 'move selected object(s) along x or y axis' },
    { action: 'alt + mouse drag on object\'s corner', description: 'resize object with center pivot' },
    { action: 'left click on empty space', description: 'Deselect object' },
    { action: 'left click on an object and drag', description: 'Select object and move it' },
    { action: 'left click on empty area and drag', description: 'Select objects in rectangle area' },
    { action: 'right click and drag', description: 'pan the canvas' },
    { action: 'scroll wheel', description: 'zoom in/out at the current mouse location' }
]

const keyboardShortcuts = [
    { action: 'arrow keys', description: 'move selected object(s) by 5 pixels' },
    { action: 'shift + arrow keys', description: 'move selected object(s) by 1 pixel' },
    { action: 'alt + up/down arrow keys', description: 'move selected object up/down' },
    { action: 'shift + alt + up/down arrow keys', description: 'move selected object to top/bottom' },
    { action: 'del', description: 'delete selected object(s)' }
]
</script>

<style scoped>
@import '@/assets/styles/dialog.scss';
.shortcuts-content {
    padding: 0px 20px; 
}

.shortcuts-section {
    margin-bottom: 8px;
}

.section-icon {
    margin-bottom: 4px;
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