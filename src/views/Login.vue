<template>
  <div class="login-container">
    <div class="login-content">
      <!-- 左侧欢迎区域 -->
      <div class="welcome-section">
        <div class="welcome-content" :class="{ 'switch-animation': isAnimating }">
          <template v-if="activeTab === 'login'">
            <h2 class="welcome-title">
              <span ref="loginTitleRef"></span>
            </h2>
            <p class="welcome-text">
              <span ref="loginSubtitleRef"></span>
            </p>
            <div class="welcome-decoration">
              <Icon icon="material-symbols:watch" class="decoration-icon pulse" />
            </div>
          </template>
          <template v-else>
            <h2 class="welcome-title">
              <span ref="registerTitleRef"></span>
            </h2>
            <p class="welcome-text">
              <span ref="registerSubtitleRef"></span>
            </p>
            <div class="welcome-decoration">
              <Icon icon="material-symbols:design-services" class="decoration-icon pulse" />
            </div>
          </template>
        </div>
      </div>

      <!-- 右侧登录框 -->
      <div class="login-box">
        <div class="tab-header">
          <button 
            :class="['tab-btn', { active: activeTab === 'login' }]" 
            @click="switchTab('login')"
          >
            登 录
          </button>
          <button 
            :class="['tab-btn', { active: activeTab === 'register' }]" 
            @click="switchTab('register')"
          >
            注 册
          </button>
        </div>

        <!-- 登录表单 -->
        <form v-show="activeTab === 'login'" @submit.prevent="handleLogin" class="form">
          <div class="form-item">
            <label for="loginEmail">邮箱</label>
            <el-input
              id="loginEmail"
              v-model="loginForm.email"
              type="email"
              required
              placeholder="请输入邮箱"
            >
              <template #prefix>
                <el-icon><Message /></el-icon>
              </template>
            </el-input>
          </div>
          <div class="form-item">
            <label for="loginPassword">密码</label>
            <el-input
              id="loginPassword"
              v-model="loginForm.password"
              type="password"
              required
              placeholder="请输入密码"
              show-password
            >
              <template #prefix>
                <el-icon><Lock /></el-icon>
              </template>
            </el-input>
          </div>
          <el-button 
            type="primary" 
            native-type="submit"
            :loading="isLoading"
            class="submit-btn"
          >
            {{ isLoading ? '登 录 中...' : '登 录' }}
          </el-button>
        </form>

        <!-- 注册表单 -->
        <form v-show="activeTab === 'register'" @submit.prevent="handleRegister" class="form">
          <div class="form-item">
            <label for="registerUsername">用户名</label>
            <el-input
              id="registerUsername"
              v-model="registerForm.username"
              required
              placeholder="请输入用户名"
            >
              <template #prefix>
                <el-icon><User /></el-icon>
              </template>
            </el-input>
          </div>
          <div class="form-item">
            <label for="registerEmail">邮箱</label>
            <el-input
              id="registerEmail"
              v-model="registerForm.email"
              type="email"
              required
              placeholder="请输入邮箱"
            >
              <template #prefix>
                <el-icon><Message /></el-icon>
              </template>
            </el-input>
          </div>
          <div class="form-item">
            <label for="registerPassword">密码</label>
            <el-input
              id="registerPassword"
              v-model="registerForm.password"
              type="password"
              required
              placeholder="请输入密码"
              show-password
            >
              <template #prefix>
                <el-icon><Lock /></el-icon>
              </template>
            </el-input>
          </div>
          <div class="form-item">
            <label for="confirmPassword">确认密码</label>
            <el-input
              id="confirmPassword"
              v-model="registerForm.confirmPassword"
              type="password"
              required
              placeholder="请再次输入密码"
              show-password
            >
              <template #prefix>
                <el-icon><Lock /></el-icon>
              </template>
            </el-input>
          </div>
          <el-button 
            type="primary" 
            native-type="submit"
            :loading="isRegistering"
            class="submit-btn"
          >
            {{ isRegistering ? '注册中...' : '注册' }}
          </el-button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useMessageStore } from '@/stores/message'
import { Message, Lock, User } from '@element-plus/icons-vue'
import { register } from '@/api/auth'
import Typed from 'typed.js'

const router = useRouter()
const authStore = useAuthStore()
const messageStore = useMessageStore()

const activeTab = ref('login')
const isLoading = ref(false)
const isRegistering = ref(false)
const isAnimating = ref(false)

const loginForm = reactive({
  email: '',
  password: ''
})

const registerForm = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const loginTitleRef = ref(null)
const loginSubtitleRef = ref(null)
const registerTitleRef = ref(null)
const registerSubtitleRef = ref(null)

// 定义打字文案
const loginTexts = {
  title: [
    "欢迎回来！^500",
    "让我们一起创造精彩^300"
  ],
  subtitle: [
    "在这里^200，每个像素都是艺术^500",
    "让创意自由绽放^500",
    "打造独特的表盘设计^500",
    "让时间更有格调^500"
  ]
}

const registerTexts = {
  title: [
    "加入我们！^500",
    "成为卓越设计师的起点^300"
  ],
  subtitle: [
    "这里是创意的舞台^500",
    "让灵感与科技相遇^500",
    "开启你的设计之旅^500",
    "创造非凡作品^500"
  ]
}

let titleTyped = null
let subtitleTyped = null

const initTypedEffect = (type) => {
  const titleRef = type === 'login' ? loginTitleRef.value : registerTitleRef.value
  const subtitleRef = type === 'login' ? loginSubtitleRef.value : registerSubtitleRef.value
  const texts = type === 'login' ? loginTexts : registerTexts

  if (titleRef) {
    titleTyped = new Typed(titleRef, {
      strings: texts.title,
      typeSpeed: 40,
      backSpeed: 20,
      backDelay: 1000,
      startDelay: 100,
      loop: true,
      showCursor: true,
      cursorChar: '|',
      autoInsertCss: true,
      onComplete: (self) => {
        if (!subtitleTyped && subtitleRef) {
          subtitleTyped = new Typed(subtitleRef, {
            strings: texts.subtitle,
            typeSpeed: 30,
            backSpeed: 15,
            backDelay: 2000,
            startDelay: 0,
            loop: true,
            showCursor: true,
            cursorChar: '|',
            autoInsertCss: true
          })
        }
      }
    })
  }
}

// 监听标签切换
watch(activeTab, (newTab) => {
  if (isAnimating.value) return
  // 增加延迟确保 DOM 已更新
  setTimeout(() => {
    initTypedEffect(newTab)
  }, 300)
})

// 组件挂载时初始化
onMounted(() => {
  // 确保 DOM 已渲染
  nextTick(() => {
    initTypedEffect('login')
  })
})

// 组件卸载时清理
onUnmounted(() => {
  if (titleTyped) titleTyped.destroy()
  if (subtitleTyped) subtitleTyped.destroy()
})

const handleLogin = async () => {
  if (isLoading.value) return

  isLoading.value = true
  try {
    const res = await authStore.login(loginForm.email, loginForm.password)
    messageStore.success('登录成功')
    const redirect = router.currentRoute.value.query.redirect || '/'
    router.push(redirect)
  } catch (error) {
    messageStore.error(error.response?.data?.message || '登录失败，请检查邮箱和密码')
  } finally {
    isLoading.value = false
  }
}

const handleRegister = async () => {
  if (isRegistering.value) return
  
  // 表单验证
  if (registerForm.password !== registerForm.confirmPassword) {
    messageStore.error('两次输入的密码不一致')
    return
  }

  if (registerForm.password.length < 6) {
    messageStore.error('密码长度不能少于6位')
    return
  }

  isRegistering.value = true
  try {
    const response = await register(registerForm.username, registerForm.email, registerForm.password)

    messageStore.success('注册成功，请登录')
    activeTab.value = 'login'
    loginForm.email = registerForm.email
    // 清空注册表单
    Object.keys(registerForm).forEach(key => registerForm[key] = '')
  } catch (error) {
    const errorMessage = error.response?.data?.error?.message || '注册失败，请稍后重试'
    messageStore.error(errorMessage)
  } finally {
    isRegistering.value = false
  }
}

const switchTab = (tab) => {
  if (activeTab.value === tab) return
  
  // 立即销毁现有的打字实例
  if (titleTyped) {
    titleTyped.destroy()
    titleTyped = null
  }
  if (subtitleTyped) {
    subtitleTyped.destroy()
    subtitleTyped = null
  }

  // 立即切换标签
  activeTab.value = tab
  isAnimating.value = true

  // 使用较短的延迟来初始化新的打字效果
  setTimeout(() => {
    nextTick(() => {
      initTypedEffect(tab)
      isAnimating.value = false
    })
  }, 100) // 减少延迟时间
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f6f8fc 0%, #e9eef6 100%);
  padding: 20px;
}

.login-content {
  display: flex;
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  width: 900px;
  max-width: 100%;
  min-height: 600px;
}

.welcome-section {
  flex: 1;
  background: linear-gradient(135deg, #1976D2 0%, #2196F3 100%);
  padding: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.welcome-content {
  text-align: center;
  z-index: 1;
  max-width: 600px;
  opacity: 1;
  transition: opacity 0.3s ease;
}

.welcome-title {
  font-size: 2.5rem;
  font-weight: 600;
  margin-bottom: 2rem;
  min-height: 80px;
  color: #ffffff;
  line-height: 1.4;
}

.welcome-text {
  font-size: 1.4rem;
  margin-bottom: 3rem;
  min-height: 60px;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.6;
}

.decoration-icon {
  font-size: 120px;
  color: rgba(255, 255, 255, 0.9);
}

.pulse {
  animation: pulse 3s infinite ease-in-out;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.1);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 0.8;
  }
}

/* 打字效果光标样式 */
:deep(.typed-cursor) {
  color: #ffffff;
  opacity: 1;
}

/* 文字渐变效果 */
:deep(.typed-fade-out) {
  opacity: 0;
  transition: opacity 0.25s;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .welcome-title {
    font-size: 2rem;
    min-height: 5rem;
  }

  .welcome-text {
    font-size: 1.2rem;
    min-height: 3rem;
  }

  .decoration-icon {
    font-size: 80px;
  }
}

.login-box {
  width: 420px;
  padding: 40px;
  background: white;
}

.tab-header {
  display: flex;
  margin-bottom: 2rem;
  border-bottom: 1px solid #eee;
}

.tab-btn {
  flex: 1;
  padding: 1rem;
  background: none;
  border: none;
  font-size: 1.1rem;
  color: #666;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.tab-btn::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 50%;
  width: 0;
  height: 2px;
  background: var(--el-color-primary);
  transition: all 0.3s ease;
  transform: translateX(-50%);
}

.tab-btn.active {
  color: var(--el-color-primary);
}

.tab-btn.active::after {
  width: 100%;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-item label {
  color: #666;
  font-size: 0.9rem;
  margin-left: 0.2rem;
}

.submit-btn {
  margin-top: 1rem;
  height: 44px;
  font-size: 1rem;
  border-radius: 8px;
}

:deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px #dcdfe6 inset;
  border-radius: 8px;
  transition: all 0.3s ease;
}

:deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px var(--el-color-primary) inset;
}

:deep(.el-input__inner) {
  height: 44px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .login-content {
    flex-direction: column;
    width: 100%;
    min-height: auto;
  }

  .welcome-section {
    padding: 30px;
  }

  .welcome-title {
    font-size: 2rem;
  }

  .login-box {
    width: 100%;
  }
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .login-container {
    background: linear-gradient(135deg, #1a1a1a 0%, #2d3748 100%);
  }

  .login-content {
    background: #2a2a2a;
  }

  .login-box {
    background: #2a2a2a;
  }

  .tab-header {
    border-bottom-color: #444;
  }

  .tab-btn {
    color: #e0e0e0;
  }

  .form-item label {
    color: #e0e0e0;
  }

  :deep(.el-input__wrapper) {
    background: #1a1a1a;
    border-color: #444;
  }
}

/* 添加过渡效果 */
.welcome-content.switch-animation {
  opacity: 0;
}
</style>
