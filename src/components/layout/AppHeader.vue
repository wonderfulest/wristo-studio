<template>
  <header class="app-header">
    <div class="header-left">
      <div class="brand">
        <img src="@/assets/favicon.svg" alt="Wristo Studio" class="logo">
        <h1 class="brand-title">Wristo Studio</h1>
      </div>
      <nav class="header-nav">
        <a @click="showDesignerConfirm" class="nav-link">
          <Icon icon="material-symbols:edit-square" />
          设计器
        </a>
        <el-dialog v-model="designerDialogVisible" title="提示" width="30%">
          <span>关闭当前操作，并打开新的设计？</span>
          <template #footer>
            <span class="dialog-footer">
              <el-button @click="designerDialogVisible = false">取消</el-button>
              <el-button type="primary" @click="confirmNewDesign">确定</el-button>
            </span>
          </template>
        </el-dialog>
        <a @click="showDesignsListConfirm" class="nav-link">
          <Icon icon="material-symbols:list" />
          我的设计
        </a>
        <router-link to="/sales" class="nav-link" >
          <Icon icon="material-symbols:list" />
          销售数据
        </router-link>
        <el-dialog v-model="designsListDialogVisible" title="提示" width="30%">
          <span>关闭当前操作，并打开设计列表？</span>
          <template #footer>
            <span class="dialog-footer">
              <el-button @click="designsListDialogVisible = false">取消</el-button>
              <el-button type="primary" @click="confirmOpenDesignsList">确定</el-button>
            </span>
          </template>
        </el-dialog>
      </nav>
    </div>

    <div class="app-info" v-if="route.path === '/design'">
      <el-input 
        type="text" 
        v-model="watchFaceName" 
        placeholder="表盘名称" 
        :input-style="{ border: 'none', background: 'transparent' }" 
      />
      <el-input 
        type="text" 
        v-model="kpayId" 
        placeholder="KPAY" 
        :input-style="{ border: 'none', background: 'transparent' }" 
      />
    </div>

    <div class="user-menu" @click="toggleDropdown" v-if="userStore.isAuthenticated">
      <div class="user-avatar">
        <div class="avatar-circle" :style="{ backgroundColor: avatarColor }">
          {{ userInitials }}
        </div>
        <el-tooltip 
          :content="userStore.userInfo?.username"
          :disabled="!isUsernameTruncated"
          placement="bottom"
        >
          <span class="username" ref="usernameRef">
            {{ truncatedUsername }}
          </span>
        </el-tooltip>
      </div>
      <div class="dropdown-menu" v-if="showDropdown">
        <div class="dropdown-item" @click="router.push('/fonts')">
          <Icon icon="material-symbols:font-download-outline" />
          字体预览
        </div>
        <div class="dropdown-item" @click="router.push('/FAQ')">
          <Icon icon="material-symbols:help-outline" />
          帮助中心
        </div>
        <div class="dropdown-item" @click="showWPayDialog">
          <Icon icon="material-symbols:help-outline" />
          WPay接入
        </div>
        <div class="dropdown-divider"></div>
        <div class="dropdown-item" @click="handleLogout">
          <Icon icon="material-symbols:logout" />
          退出登录
        </div>
      </div>
    </div>
  </header>
  <WPayTokenDialog ref="wpayDialogRef" />
  <CreateDesignDialog ref="createDesignDialogRef" />
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useBaseStore } from '@/stores/baseStore'
import { useUserStore } from '@/stores/user'
import { useMessageStore } from '@/stores/message'
import WPayTokenDialog from '../dialogs/WPayTokenDialog.vue'
import CreateDesignDialog from '../dialogs/CreateDesignDialog.vue'

const props = defineProps({
  // 其他需要保留的 props
})

const emit = defineEmits(['update:isDialogVisible'])

const router = useRouter()
const route = useRoute()
const baseStore = useBaseStore()
const userStore = useUserStore()
const messageStore = useMessageStore()

const user = computed(() => userStore.userInfo)
const showDropdown = ref(false)
const designerDialogVisible = ref(false)
const designsListDialogVisible = ref(false)
const usernameRef = ref(null)
const isUsernameTruncated = ref(false)
const wpayDialogRef = ref(null)
const createDesignDialogRef = ref(null)

// 计算属性
const watchFaceName = computed({
  get: () => baseStore.watchFaceName,
  set: (value) => baseStore.setWatchFaceName(value)
})

const kpayId = computed({
  get: () => baseStore.kpayId,
  set: (value) => baseStore.setKpayId(value)
})

const userInitials = computed(() => {
  const username = userStore.userInfo?.username || ''
  return username
    .split(/\s+/)
    .slice(0, 2)
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    || username.charAt(0).toUpperCase()
})

const avatarColor = computed(() => {
  const colors = [
    '#f56a00', '#7265e6', '#ffbf00', '#00a2ae',
    '#712fd1', '#f74584', '#13c2c2', '#6f42c1'
  ]
  const username = userStore.userInfo?.username || ''
  const index = Array.from(username).reduce(
    (acc, char) => acc + char.charCodeAt(0), 0
  ) % colors.length
  return colors[index]
})

const truncatedUsername = computed(() => {
  const username = userStore.userInfo?.username || ''
  const maxLength = 12
  if (username.length <= maxLength) return username
  return `${username.slice(0, maxLength)}...`
})

const showDesignerConfirm = () => {
  designerDialogVisible.value = true
}

const showDesignsListConfirm = () => {
  designsListDialogVisible.value = true
}

const confirmNewDesign = () => {
  designerDialogVisible.value = false
  createDesignDialogRef.value?.show()
}

const confirmOpenDesignsList = () => {
  designsListDialogVisible.value = false
  baseStore.$reset()
  router.push('/designs')
}

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value
}

const handleLogout = () => {
  userStore.logout()
  const ssoBaseUrl = import.meta.env.VITE_SSO_LOGIN_URL
  const redirectUri = import.meta.env.VITE_SSO_REDIRECT_URI
  window.location.href = `${ssoBaseUrl}?client=studio&redirect_uri=${encodeURIComponent(redirectUri)}`
}

const showWPayDialog = () => {
  wpayDialogRef.value?.show()
}

// 生命周期钩子
onMounted(() => {
  const checkTruncation = () => {
    if (!usernameRef.value) return
    const element = usernameRef.value
    isUsernameTruncated.value = element.scrollWidth > element.clientWidth
  }

  const closeDropdown = (e) => {
    if (!e.target.closest('.user-menu')) {
      showDropdown.value = false
    }
  }

  checkTruncation()
  window.addEventListener('resize', checkTruncation)
  window.addEventListener('click', closeDropdown)

  onUnmounted(() => {
    window.removeEventListener('resize', checkTruncation)
    window.removeEventListener('click', closeDropdown)
  })
})
</script>

<style scoped>
.app-header {
  height: 60px;
  background: #fff;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  position: relative;
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 32px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  width: 32px;
  height: 32px;
  transition: transform 0.3s ease;
}

.logo:hover {
  transform: rotate(360deg);
}

.brand-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #2c3e50;
  margin: 0;
  background: linear-gradient(120deg, #409EFF, #2c3e50);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.header-nav {
  display: flex;
  gap: 20px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  color: #666;
  font-size: 14px;
  text-decoration: none;
  border-radius: 6px;
  transition: all 0.2s ease;
  cursor: pointer;
  user-select: none;
}

.nav-link:hover {
  color: #2196F3;
  background-color: rgba(33, 150, 243, 0.08);
}

.nav-link :deep(svg) {
  width: 18px;
  height: 18px;
}

.app-info {
  display: flex;
  gap: 16px;
  max-width: 400px;
}

.app-info :deep(.el-input) {
  width: 180px;
}

.app-info :deep(.el-input__wrapper) {
  box-shadow: none !important;
  padding: 0 8px;
}

.app-info :deep(.el-input__inner) {
  height: 36px;
  font-size: 14px;
  color: #333;
}

.app-info :deep(.el-input__inner::placeholder) {
  color: #999;
}

.actions {
  display: flex;
  gap: 12px;
}

.action-btn {
  padding: 8px 20px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: white;
  color: #666;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}

.action-btn:hover {
  color: #2196F3;
  border-color: #2196F3;
  background: rgba(33, 150, 243, 0.04);
}

.user-menu {
  position: relative;
  height: 60px;
  display: flex;
  align-items: center;
}

.user-avatar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.user-avatar:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.avatar-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 15px;
  font-weight: 500;
  user-select: none;
  transition: transform 0.2s ease;
}

.user-avatar:hover .avatar-circle {
  transform: scale(1.05);
}

.username {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  min-width: 160px;
  padding: 6px;
  z-index: 1000;
  transform-origin: top right;
  animation: dropdown-fade 0.2s ease;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  color: #333;
  font-size: 14px;
  transition: all 0.2s ease;
  border-radius: 6px;
  cursor: pointer;
}

.dropdown-item:hover {
  background-color: rgba(33, 150, 243, 0.08);
  color: #2196F3;
}

.dropdown-item :deep(svg) {
  width: 18px;
  height: 18px;
}

.dropdown-divider {
  height: 1px;
  background-color: #f0f0f0;
  margin: 6px;
}

@keyframes dropdown-fade {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .app-header {
    background: #1a1a1a;
    border-bottom-color: #333;
  }

  .brand-title {
    background: linear-gradient(120deg, #409EFF, #ffffff);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .nav-link {
    color: #e0e0e0;
  }

  .nav-link:hover {
    background-color: rgba(33, 150, 243, 0.15);
  }

  .app-info :deep(.el-input__inner) {
    color: #e0e0e0;
    background: transparent;
  }

  .action-btn {
    background: #2a2a2a;
    border-color: #404040;
    color: #e0e0e0;
  }

  .action-btn:hover {
    background: rgba(33, 150, 243, 0.15);
  }

  .username {
    color: #e0e0e0;
  }

  .dropdown-menu {
    background-color: #2a2a2a;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  }

  .dropdown-item {
    color: #e0e0e0;
  }

  .dropdown-item:hover {
    background-color: rgba(33, 150, 243, 0.15);
  }

  .dropdown-divider {
    background-color: #404040;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .app-header {
    padding: 0 16px;
  }

  .header-left {
    gap: 20px;
  }

  .header-left h1 {
    font-size: 18px;
  }

  .nav-link {
    padding: 6px 12px;
  }

  .app-info :deep(.el-input) {
    width: 140px;
  }

  .username {
    max-width: 80px;
  }
}
</style> 