<template>
  <div class="design-list">
    <div class="header">
      <div class="header-left">
        <div class="icon-buttons">
          <el-tooltip content="Pending Go Live" placement="bottom">
            <template #default>
              <el-badge 
                v-if="hasPending"
                :value="pendingCount"
                :max="99"
                type="danger"
                class="pending-badge"
              >
                <el-button 
                  class="icon-btn"
                  :class="{ 'is-active': isPendingRoute }"
                  @click="navigateTo('pending-go-live')"
                >
                  <el-icon><Promotion /></el-icon>
                </el-button>
              </el-badge>
              <el-button 
                v-else
                class="icon-btn"
                :class="{ 'is-active': isPendingRoute }"
                @click="navigateTo('pending-go-live')"
              >
                <el-icon><Promotion /></el-icon>
              </el-button>
            </template>
          </el-tooltip>
        </div>
        <h2 
          :class="{ 'active': isMyDesignsRoute }" 
          @click="navigateTo('my-designs')"
        >
          My Projects
        </h2>
      </div>
    </div>

    <!-- 使用 keep-alive 包裹 router-view -->
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <keep-alive>
          <component 
            :is="Component" 
            :key="$route.fullPath"
          />
        </keep-alive>
      </transition>
    </router-view>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMessageStore } from '@/stores/message'
import { Promotion } from '@element-plus/icons-vue'
import { usePendingGoLiveStore } from '@/stores/pendingGoLive'

const router = useRouter()
const route = useRoute()
const messageStore = useMessageStore()

// 计算当前路由状态
const isMyDesignsRoute = computed(() => route.name === 'my-designs')
const isPendingRoute = computed(() => route.name === 'pending-go-live')

const pendingStore = usePendingGoLiveStore()
const pendingCount = computed<number>(() => pendingStore.count)
const hasPending = computed<boolean>(() => pendingStore.count > 0)

// 导航方法
const navigateTo = async (routeName: string) => {
  try {
    await router.push({ 
      name: routeName,
      replace: true
    })
  } catch (error) {
    console.error('[DesignList] navigation error:', error)
    messageStore.error('Navigation failed')
  }
}

onMounted(() => {
  pendingStore.fetch()
})
</script>

<style scoped>
.design-list {
  padding: 0 32px;
  height: calc(100vh - 60px);
  overflow-y: auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 16px 0;
  border-bottom: 1px solid #ebeef5;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.icon-buttons {
  display: flex;
  gap: 12px;
}

.icon-btn {
  width: 40px;
  height: 40px;
  padding: 8px;
  border-radius: 8px;
  
  &:hover {
    background-color: var(--el-fill-color-light);
  }
  
  .el-icon {
    font-size: 20px;
  }
}

h2 {
  margin: 0;
  font-size: 24px;
  cursor: pointer;
  color: var(--el-text-color-regular);
  transition: color 0.3s;
  
  &:hover {
    color: var(--el-text-color-primary);
  }
  
  &.active {
    color: var(--el-text-color-primary);
    font-weight: 600;
  }
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  .icon-btn:hover {
    background-color: var(--el-fill-color-dark);
  }
}

/* 添加路由过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 激活状态样式 */
.icon-btn.is-active {
  color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
}
</style>
