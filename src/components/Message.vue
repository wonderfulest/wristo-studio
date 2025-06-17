<template>
  <transition-group name="message-fade" tag="div" class="message-container">
    <div v-for="msg in messages" :key="msg.id" :class="['message', msg.type]">
      <span class="message-content">{{ msg.content }}</span>
    </div>
  </transition-group>
</template>

<script setup>
import { useMessageStore } from '../stores/message'
import { storeToRefs } from 'pinia'

const messageStore = useMessageStore()
const { messages } = storeToRefs(messageStore)
</script>

<style scoped>
.message-container {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.message {
  padding: 10px 20px;
  border-radius: 4px;
  background: #fff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  min-width: 300px;
  max-width: 500px;
}

.message.success {
  background: #f0f9eb;
  color: #67c23a;
  border: 1px solid #c2e7b0;
}

.message.error {
  background: #fef0f0;
  color: #f56c6c;
  border: 1px solid #fbc4c4;
}

.message.info {
  background: #f4f4f5;
  color: #909399;
  border: 1px solid #e9e9eb;
}

.message.warning {
  background: #fdf6ec;
  color: #e6a23c;
  border: 1px solid #f5dab1;
}

.message-content {
  margin-left: 10px;
}

/* 过渡动画 */
.message-fade-enter-active,
.message-fade-leave-active {
  transition: all 0.3s ease;
}

.message-fade-enter-from {
  transform: translateY(-20px);
  opacity: 0;
}

.message-fade-leave-to {
  transform: translateY(-20px);
  opacity: 0;
}
</style>
