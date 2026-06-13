<template>
  <div class="faq-container">
    <h1 class="text-2xl font-bold mb-8">{{ t('faq.title') }}</h1>

    <el-tabs v-model="activeTab" class="faq-tabs">
      <!-- 基础使用指南 -->
      <el-tab-pane :label="t('faq.basic')" name="basic">
        <div class="faq-section">
          <el-collapse>
            <el-collapse-item :title="t('faq.q1')" name="1">
              <div class="faq-content">
                <ol class="list-decimal ml-4">
                  <li>{{ t('faq.q1.a1') }}</li>
                  <li>{{ t('faq.q1.a2') }}</li>
                  <li>{{ t('faq.q1.a3') }}</li>
                  <li>{{ t('faq.q1.a4') }}</li>
                  <li>{{ t('faq.q1.a5') }}</li>
                  <li>{{ t('faq.q1.a6') }}</li>
                </ol>
              </div>
            </el-collapse-item>

            <el-collapse-item :title="t('faq.q2')" name="2">
              <div class="faq-content">
                <p>{{ t('faq.q2.intro') }}</p>
                <ol class="list-decimal ml-4">
                  <li>{{ t('faq.q2.a1') }}</li>
                  <li>{{ t('faq.q2.a2') }}</li>
                  <li>{{ t('faq.q2.a3') }}</li>
                  <li>{{ t('faq.q2.a4') }}</li>
                </ol>
                <p class="text-red-500 mt-2">{{ t('faq.q2.note') }}</p>
              </div>
            </el-collapse-item>

            <el-collapse-item :title="t('faq.q3')" name="3">
              <div class="faq-content">
                <p>{{ t('faq.q3.intro') }}</p>
                <ul class="list-disc ml-4">
                  <li>{{ t('faq.q3.a1') }}</li>
                  <li>{{ t('faq.q3.a2') }}</li>
                  <li>{{ t('faq.q3.a3') }}</li>
                </ul>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>
      </el-tab-pane>

      <!-- 设计规范 -->
      <el-tab-pane :label="t('faq.rules')" name="rules">
        <div class="faq-section">
          <el-collapse>
            <el-collapse-item :title="t('faq.q4')" name="4">
              <div class="faq-content">
                <p>{{ t('faq.q4.intro') }}</p>
                <ul class="list-disc ml-4">
                  <li>{{ t('faq.q4.a1') }}</li>
                  <li>{{ t('faq.q4.a2') }}</li>
                  <li>{{ t('faq.q4.a3') }}</li>
                </ul>
              </div>
            </el-collapse-item>

            <el-collapse-item :title="t('faq.q5')" name="5">
              <div class="faq-content">
                <ul class="list-disc ml-4">
                  <li>{{ t('faq.q5.a1') }}</li>
                  <li>{{ t('faq.q5.a2') }}</li>
                  <li>{{ t('faq.q5.a3') }}</li>
                  <li>{{ t('faq.q5.a4') }}</li>
                </ul>

                <div class="mt-4">
                  <p class="font-medium text-red-500">{{ t('faq.q5.namingTitle') }}</p>
                  <ul class="list-disc ml-4 mt-2">
                    <li>{{ t('faq.q5.namingA1') }}</li>
                    <li>{{ t('faq.q5.namingA2') }}</li>
                    <ul class="list-circle ml-8 mt-2">
                      <li>{{ t('faq.q5.toolFontForge') }}
                        <div class="bg-gray-100 p-2 mt-1 rounded text-sm font-mono">
                          fontforge -lang=ff -c 'Open($1); Print($fontname)' 字体文件路径
                        </div>
                      </li>
                      <li>{{ t('faq.q5.toolFontCreator') }}</li>
                      <li>{{ t('faq.q5.toolTransType') }}</li>
                      <li>{{ t('faq.q5.toolFontLab') }}</li>
                    </ul>
                    <li class="mt-2">{{ t('faq.q5.namingExample') }}</li>
                  </ul>
                </div>

                <div class="bg-blue-50 p-4 rounded mt-4">
                  <p class="text-blue-700">
                    <i class="el-icon-info mr-2"></i>
                    {{ t('faq.q5.tip') }}
                  </p>
                </div>
              </div>
            </el-collapse-item>

            <el-collapse-item :title="t('faq.q6')" name="6">
              <div class="faq-content">
                <p>{{ t('faq.q6.intro') }}</p>
                <ul class="list-disc ml-4">
                  <li>{{ t('faq.q6.a1') }}</li>
                  <li>{{ t('faq.q6.a2') }}</li>
                  <li>{{ t('faq.q6.a3') }}</li>
                  <li>{{ t('faq.q6.a4') }}</li>
                </ul>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>
      </el-tab-pane>

      <!-- 常见问题 -->
      <el-tab-pane :label="t('faq.qa')" name="qa">
        <div class="faq-section">
          <el-collapse>
            <el-collapse-item :title="t('faq.q7')" name="7">
              <div class="faq-content">
                <p>{{ t('faq.q7.intro') }}</p>
                <ul class="list-disc ml-4">
                  <li>{{ t('faq.q7.a1') }}</li>
                  <li>{{ t('faq.q7.a2') }}</li>
                  <li>{{ t('faq.q7.a3') }}</li>
                  <li>{{ t('faq.q7.a4') }}</li>
                </ul>
              </div>
            </el-collapse-item>

            <el-collapse-item :title="t('faq.q8')" name="8">
              <div class="faq-content">
                <ol class="list-decimal ml-4">
                  <li>{{ t('faq.q8.a1') }}</li>
                  <li>{{ t('faq.q8.a2') }}</li>
                  <li>{{ t('faq.q8.a3') }}</li>
                  <li>{{ t('faq.q8.a4') }}</li>
                </ol>
              </div>
            </el-collapse-item>

            <el-collapse-item :title="t('faq.q9')" name="9">
              <div class="faq-content">
                <p>{{ t('faq.q9.intro') }}</p>
                <ul class="list-disc ml-4">
                  <li>{{ t('faq.q9.a1') }}</li>
                  <li>{{ t('faq.q9.a2') }}</li>
                  <li>{{ t('faq.q9.a3') }}</li>
                </ul>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from '@/i18n'

const activeTab = ref('basic')
const { t } = useI18n()
</script>

<style scoped>
.faq-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
  color: var(--studio-text);
}

.faq-section {
  margin-bottom: 32px;
}

.faq-content {
  line-height: 1.6;
  color: var(--studio-text-muted);
}

.faq-content p {
  margin-bottom: 12px;
}

.faq-content ul,
.faq-content ol {
  margin-bottom: 16px;
}

.faq-content li {
  margin-bottom: 8px;
}

:deep(.el-collapse-item__header) {
  font-size: 16px;
  font-weight: 500;
}

:deep(.el-tabs__item) {
  font-size: 16px;
}

:deep(.el-collapse) {
  border: none;
}

:deep(.el-collapse-item) {
  background: var(--studio-surface);
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-md);
  margin-bottom: 16px;
  box-shadow: var(--studio-shadow-sm);
  overflow: hidden;
}

:deep(.el-collapse-item__header),
:deep(.el-collapse-item__wrap) {
  background: var(--studio-surface);
  color: var(--studio-text);
  border-color: var(--studio-border);
}

:deep(.el-collapse-item__content) {
  color: var(--studio-text-muted);
}

.bg-gray-100 {
  background: var(--studio-surface-soft);
  color: var(--studio-text);
}

.bg-blue-50 {
  background: var(--studio-primary-soft);
  border: 1px solid var(--studio-primary-border);
}

.text-blue-700 {
  color: var(--studio-primary);
}

.list-circle {
  list-style-type: circle;
}

.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
</style> 
