<template>
  <div class="faq-container">
    <h1 class="text-2xl font-bold mb-8">常见问题解答</h1>

    <el-tabs v-model="activeTab" class="faq-tabs">
      <!-- 基础使用指南 -->
      <el-tab-pane label="基础使用指南" name="basic">
        <div class="faq-section">
          <el-collapse>
            <el-collapse-item title="如何开始设计表盘？" name="1">
              <div class="faq-content">
                <ol class="list-decimal ml-4">
                  <li>点击顶部导航栏的"新建设计"按钮</li>
                  <li>选择合适的表盘尺寸和型号</li>
                  <li>在画布中进行设计</li>
                  <li>使用右侧工具栏添加元素（时间、日期、图片等）</li>
                  <li>调整元素的位置、大小和样式</li>
                  <li>预览并保存设计</li>
                </ol>
              </div>
            </el-collapse-item>

            <el-collapse-item title="如何使用自定义字体？" name="2">
              <div class="faq-content">
                <p>添加自定义字体的步骤：</p>
                <ol class="list-decimal ml-4">
                  <li>准备TTF格式的字体文件</li>
                  <li>在文字编辑面板中点击"添加字体"</li>
                  <li>选择并上传字体文件</li>
                  <li>等待字体审核通过后即可使用</li>
                </ol>
                <p class="text-red-500 mt-2">注意：请确保您有权使用该字体文件</p>
              </div>
            </el-collapse-item>

            <el-collapse-item title="如何预览表盘效果？" name="3">
              <div class="faq-content">
                <p>预览方式：</p>
                <ul class="list-disc ml-4">
                  <li>实时预览：设计过程中右侧预览窗口实时显示效果</li>
                  <li>设备预览：点击顶部"预览"按钮，查看在实际设备上的效果</li>
                  <li>动态预览：可以预览不同时间、日期的显示效果</li>
                </ul>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>
      </el-tab-pane>

      <!-- 设计规范 -->
      <el-tab-pane label="设计规范" name="rules">
        <div class="faq-section">
          <el-collapse>
            <el-collapse-item title="设计尺寸要求" name="4">
              <div class="faq-content">
                <p>请严格遵守以下尺寸规范：</p>
                <ul class="list-disc ml-4">
                  <li>表盘尺寸必须符合选定设备的规格</li>
                  <li>元素不得超出安全区域</li>
                  <li>建议预留足够边距，确保显示清晰</li>
                </ul>
              </div>
            </el-collapse-item>

            <el-collapse-item title="字体使用规则" name="5">
              <div class="faq-content">
                <ul class="list-disc ml-4">
                  <li>仅支持TTF格式字体文件</li>
                  <li>字体大小建议在12px-72px之间</li>
                  <li>请确保字体版权合规</li>
                  <li>系统默认字体无需单独上传</li>
                </ul>

                <div class="mt-4">
                  <p class="font-medium text-red-500">重要提示：字体文件命名规则</p>
                  <ul class="list-disc ml-4 mt-2">
                    <li>字体文件名必须与字体的 PostScript Name 保持完全一致</li>
                    <li>您可以使用以下工具查看字体的 PostScript Name：</li>
                    <ul class="list-circle ml-8 mt-2">
                      <li>FontForge（开源免费）
                        <div class="bg-gray-100 p-2 mt-1 rounded text-sm font-mono">
                          fontforge -lang=ff -c 'Open($1); Print($fontname)' 字体文件路径
                        </div>
                      </li>
                      <li>FontCreator（Windows系统）</li>
                      <li>TransType（跨平台）</li>
                      <li>FontLab（专业字体编辑软件）</li>
                    </ul>
                    <li class="mt-2">示例：如果字体的 PostScript Name 为 "SourceHanSansCN-Bold"，则文件名必须为 "SourceHanSansCN-Bold.ttf"</li>
                  </ul>
                </div>

                <div class="bg-blue-50 p-4 rounded mt-4">
                  <p class="text-blue-700">
                    <i class="el-icon-info mr-2"></i>
                    提示：正确的文件命名可以确保字体在系统中正常加载和使用。错误的命名可能导致字体无法正常显示或产生渲染问题。
                  </p>
                </div>
              </div>
            </el-collapse-item>

            <el-collapse-item title="设计审核标准" name="6">
              <div class="faq-content">
                <p>设计提交审核需符合以下标准：</p>
                <ul class="list-disc ml-4">
                  <li>内容健康合规，无违规信息</li>
                  <li>图片清晰，无明显画质问题</li>
                  <li>元素排版合理，信息清晰可读</li>
                  <li>遵守知识产权相关规定</li>
                </ul>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>
      </el-tab-pane>

      <!-- 常见问题 -->
      <el-tab-pane label="常见问题" name="qa">
        <div class="faq-section">
          <el-collapse>
            <el-collapse-item title="设计无法保存怎么办？" name="7">
              <div class="faq-content">
                <p>可能的原因和解决方案：</p>
                <ul class="list-disc ml-4">
                  <li>检查网络连接是否正常</li>
                  <li>确保所有必填信息已填写完整</li>
                  <li>尝试刷新页面后重新操作</li>
                  <li>如果问题持续，请联系客服支持</li>
                </ul>
              </div>
            </el-collapse-item>

            <el-collapse-item title="如何处理设计审核未通过？" name="8">
              <div class="faq-content">
                <ol class="list-decimal ml-4">
                  <li>仔细阅读审核反馈意见</li>
                  <li>根据意见修改设计内容</li>
                  <li>确保修改后符合设计规范</li>
                  <li>重新提交审核</li>
                </ol>
              </div>
            </el-collapse-item>

            <el-collapse-item title="技术支持与反馈" name="9">
              <div class="faq-content">
                <p>如需帮助，可通过以下方式联系我们：</p>
                <ul class="list-disc ml-4">
                  <li>发送邮件至：wonder.gface@gmail.com</li>
                  <li>工作时间：周一至周日 0:00-24:00</li>
                  <li>在线客服：点击右下角客服图标</li>
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

const activeTab = ref('basic')
</script>

<style scoped>
.faq-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.faq-section {
  margin-bottom: 32px;
}

.faq-content {
  line-height: 1.6;
  color: #666;
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
  background: #fff;
  border-radius: 8px;
  margin-bottom: 16px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.05);
}

.list-circle {
  list-style-type: circle;
}

.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
</style> 