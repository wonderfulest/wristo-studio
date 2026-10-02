<template>
  <div class="design-list">
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

<style scoped>
.design-list {
  padding: 12px 28px 32px;
  min-height: 100%;
  background:
    linear-gradient(180deg, var(--studio-surface-raised), rgba(255, 255, 255, 0) 190px),
    var(--studio-bg);
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
    padding: 12px 16px 24px;
  }

}
</style>
