<template>
  <div class="design-list">
    <div class="header">
      <div class="header-left">
        <div class="icon-buttons">
          <el-tooltip content="Recommended Templates" placement="bottom">
            <el-button 
              class="icon-btn"
              :class="{ 'is-active': isTemplatesRoute }"
              @click="navigateTo('design-templates')"
            >
              <el-icon><Star /></el-icon>
            </el-button>
          </el-tooltip>
          
          <el-tooltip content="My Favorites" placement="bottom">
            <el-button 
              class="icon-btn"
              :class="{ 'is-active': isFavoritesRoute }"
              @click="navigateTo('favorite-designs')"
            >
              <el-icon><Collection /></el-icon>
            </el-button>
          </el-tooltip>
        </div>
        <h2 
          :class="{ 'active': isMyDesignsRoute }" 
          @click="navigateTo('my-designs')"
        >
          My Designs
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

<script setup>
import { ref, onMounted, computed, defineAsyncComponent, onActivated } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMessageStore } from '@/stores/message'
import { Star, Collection } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const messageStore = useMessageStore()

// 计算当前路由状态
const isMyDesignsRoute = computed(() => route.name === 'my-designs')
const isTemplatesRoute = computed(() => route.name === 'design-templates')
const isFavoritesRoute = computed(() => route.name === 'favorite-designs')

// 导航方法
const navigateTo = async (routeName) => {
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

// 异步导入组件
const MyDesigns = defineAsyncComponent(() => import('./designs/MyDesigns.vue'))
const TemplateList = defineAsyncComponent(() => import('./designs/TemplateList.vue'))

onMounted(() => {
})

onActivated(() => {
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
