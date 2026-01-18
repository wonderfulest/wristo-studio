<template>
  <el-dialog
    v-model="dialogVisible"
    title="System Changelog"
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
        <el-checkbox v-model="dontShowAgain">Do not show this version update reminder again</el-checkbox>
        <el-button type="primary" @click="handleClose" class="dialog-btn">
          OK
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

// Store the latest viewed version in localStorage
const lastViewedVersion = useLocalStorage(config.changelog.storageKey, null)

// Check whether the changelog dialog should be displayed
const checkShowChangelog = () => {
  // If the feature is disabled, do nothing
  if (!config.changelog.enabled) {
    return
  }

  // If lastViewedVersion is null, it means this is the first visit
  if (lastViewedVersion.value === null) {
    dialogVisible.value = true
    return
  }

  const latestVersion = config.changelog.versions[0].version
  // Compare version numbers
  if (compareVersions(lastViewedVersion.value, latestVersion) < 0) {
    dialogVisible.value = true
  }
}

// Version comparison function
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

// Handle dialog close
const handleClose = () => {
  if (dontShowAgain.value) {
    // If user chose not to show again, update the last viewed version
    lastViewedVersion.value = config.changelog.versions[0].version
  }
  dialogVisible.value = false
}

// On mounted, check whether to show the changelog dialog
onMounted(() => {
  // Add a slight delay to ensure other components finish loading first
  setTimeout(() => {
    checkShowChangelog()
  }, 500)
})

// Expose methods for external use
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
