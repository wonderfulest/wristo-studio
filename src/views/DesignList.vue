<template>
  <div class="design-list">
    <div class="header">
      <div class="header-left">
        <div class="icon-buttons">
          <el-tooltip :content="t('project.pendingGoLive')" placement="bottom">
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
          {{ t('project.myProjects') }}
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
import { useI18n } from '@/i18n'

const router = useRouter()
const route = useRoute()
const messageStore = useMessageStore()
const { t } = useI18n()

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
    messageStore.error(t('common.navigationFailed'))
  }
}

onMounted(() => {
  pendingStore.fetch()
})
</script>

<style scoped>
.design-list {
  padding: 0 28px 32px;
  min-height: 100%;
  background:
    linear-gradient(180deg, var(--studio-surface-raised), rgba(255, 255, 255, 0) 190px),
    var(--studio-bg);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px 0 16px;
  border-bottom: 1px solid var(--studio-border);
  position: sticky;
  top: 0;
  z-index: 5;
  background: var(--studio-overlay-surface);
  backdrop-filter: blur(12px);
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
  width: 44px;
  height: 44px;
  padding: 0;
  border-radius: var(--studio-radius-md);
  border-color: var(--studio-border);
  background: var(--studio-surface);
  
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
  color: var(--studio-text-muted);
  transition: color 0.3s;
  font-weight: 800;
  
  &:hover {
    color: var(--el-text-color-primary);
  }
  
  &.active {
    color: var(--studio-text);
    font-weight: 850;
  }
}

:global(html[data-studio-theme='dark']) .design-list {
  background:
    linear-gradient(180deg, rgba(24, 33, 47, 0.72), rgba(24, 33, 47, 0) 190px),
    var(--studio-bg);
}

:global(html[data-studio-theme='dark']) .icon-btn:hover {
  background-color: var(--el-fill-color-dark);
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
  color: var(--studio-primary);
  background-color: var(--studio-primary-soft);
  border-color: var(--studio-primary-border);
}

@media (max-width: 720px) {
  .design-list {
    padding: 0 16px 24px;
  }

  .header-left {
    gap: 14px;
  }
}
</style>
