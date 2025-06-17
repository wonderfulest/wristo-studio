<template>
  <div class="side-panel">
    <!-- 添加元素按钮，仅在图层面板时显示 -->
    <div v-if="!isAddElementMode" class="add-element-button">
      <el-button class="op-btn" round type="primary" @click="switchToAddElement">添加元素</el-button>
    </div>

    <!-- 面板容器 -->
    <div class="panel-container">
      <AddElementPanel v-if="isAddElementMode" />
      <LayerPanel v-else />
    </div>

    <!-- 取消按钮，仅在添加元素面板时显示 -->
    <div v-if="isAddElementMode" class="cancel-button">
      <el-button round type="info" @click="switchToLayer" class="op-btn">取 消</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import AddElementPanel from './AddElementPanel.vue'
import LayerPanel from './LayerPanel.vue'

const isAddElementMode = ref(false)

const switchToAddElement = () => {
  isAddElementMode.value = true
}

const switchToLayer = () => {
  isAddElementMode.value = false
}

// 导出给子组件使用
defineExpose({
  switchToLayer
})
</script>

<style scoped>
.side-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
}

.add-element-button {
  padding: 16px;
}

.panel-container {
  flex: 1;
  overflow: auto;
}

.cancel-button {
  padding: 16px;
  border-top: 1px solid var(--el-border-color);
}

:deep(.el-button) {
  width: 100%;
}
.op-btn {
  font-size: 20px;
  height: 48px;
}
</style>
