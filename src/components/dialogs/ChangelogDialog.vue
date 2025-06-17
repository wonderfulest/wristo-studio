<template>
  <el-dialog
    v-model="dialogVisible"
    title="系统更新日志"
    width="1024px"
    :show-close="true"
    destroy-on-close
    class="changelog-dialog"
  >
    <div class="dialog-content">
      <div class="version-section" v-for="version in config.changelog.versions" :key="version.version">
        <h3 class="version-title">
          v{{ version.version }}
          <span class="version-date">{{ version.date }}</span>
        </h3>
        <ul class="update-list">
          <li v-for="(update, index) in version.updates" :key="index" class="update-item">
            {{ update }}
          </li>
        </ul>
      </div>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <el-checkbox v-model="dontShowAgain">不再显示此版本更新提醒</el-checkbox>
        <el-button type="primary" @click="handleClose" class="dialog-btn">
          确定
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import appConfig from '@/config/appConfig'

const config = appConfig
const dialogVisible = ref(false)
const dontShowAgain = ref(false)

// 在 localStorage 中存储用户已查看的最新版本
const lastViewedVersion = useLocalStorage(config.changelog.storageKey, null)

// 检查是否需要显示更新日志
const checkShowChangelog = () => {
  // 如果功能未启用，直接返回
  if (!config.changelog.enabled) {
    return
  }

  // 如果 lastViewedVersion 为 null，说明是第一次访问
  if (lastViewedVersion.value === null) {
    dialogVisible.value = true
    return
  }

  const latestVersion = config.changelog.versions[0].version
  // 比较版本号
  if (compareVersions(lastViewedVersion.value, latestVersion) < 0) {
    dialogVisible.value = true
  }
}

// 版本号比较函数
const compareVersions = (v1, v2) => {
  const parts1 = v1.split('.').map(Number)
  const parts2 = v2.split('.').map(Number)
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const num1 = parts1[i] || 0
    const num2 = parts2[i] || 0
    
    if (num1 < num2) return -1
    if (num1 > num2) return 1
  }
  
  return 0
}

// 处理关闭对话框
const handleClose = () => {
  if (dontShowAgain.value) {
    // 如果用户选择不再显示，更新最后查看的版本
    lastViewedVersion.value = config.changelog.versions[0].version
  }
  dialogVisible.value = false
}

// 组件挂载时检查是否需要显示更新日志
onMounted(() => {
  // 添加一个小延时，确保在其他组件加载完成后显示
  setTimeout(() => {
    checkShowChangelog()
  }, 500)
})

// 导出方法供外部调用
defineExpose({
  checkShowChangelog
})
</script>

<style scoped>
@import '@/assets/styles/dialog.scss';

.version-section {
  margin-bottom: 24px;
}

.version-section:last-child {
  margin-bottom: 0;
}

.version-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 12px 0;
  color: var(--el-text-color-primary);
  font-size: 16px;
}

.version-date {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  font-weight: normal;
}

.update-list {
  margin: 0;
  padding-left: 20px;
}

.update-list li {
  margin-bottom: 8px;
  color: var(--el-text-color-regular);
  line-height: 1.5;
  white-space: pre-line;
}

.update-list li:last-child {
  margin-bottom: 0;
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
}
</style>
