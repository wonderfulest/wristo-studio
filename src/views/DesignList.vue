<template>
  <div class="design-list">
    <div class="header">
      <div class="header-left">
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
import { showErrorOnce } from '@/utils/errorMessage'

import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from '@/i18n'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()

// 计算当前路由状态
const isMyDesignsRoute = computed(() => route.name === 'my-designs')


// 导航方法
const navigateTo = async (routeName: string) => {
  try {
    await router.push({ 
      name: routeName,
      replace: true
    })
  } catch (error) {
    console.error('[DesignList] navigation error:', error)
    showErrorOnce(error, t('common.navigationFailed'))
  }
}

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
  margin-bottom: 16px;
  padding: 18px 0 12px;
  position: sticky;
  top: 0;
  z-index: 5;
  background: var(--studio-overlay-surface);
  backdrop-filter: blur(12px);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

h2 {
  margin: 0;
  font-size: 23px;
  letter-spacing: -0.025em;
  cursor: pointer;
  color: var(--studio-text-muted);
  transition: color 0.3s;
  font-weight: 700;
  
  &:hover {
    color: var(--el-text-color-primary);
  }
  
  &.active {
    color: var(--studio-text);
    font-weight: 700;
  }
}

:global(html[data-studio-theme='dark']) .design-list {
  background:
    linear-gradient(180deg, rgba(24, 33, 47, 0.72), rgba(24, 33, 47, 0) 190px),
    var(--studio-bg);
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

@media (max-width: 720px) {
  .design-list {
    padding: 0 16px 24px;
  }

  .header-left {
    gap: 14px;
  }
}
</style>
