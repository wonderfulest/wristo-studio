<template>
  <div class="academy-page">
    <header class="academy-topbar">
      <button type="button" class="academy-brand" @click="startProject">
        <img src="https://cdn.wristo.io/brands/wristo-logo/svg/wristo-mark.svg" alt="" class="academy-logo">
        <span>Wristo Studio</span>
      </button>
      <el-button type="primary" @click="startProject">{{ copy.startProject }}</el-button>
    </header>

    <main class="academy-shell">
      <section class="academy-hero">
        <p class="eyebrow">{{ copy.eyebrow }}</p>
        <h1>{{ copy.title }}</h1>
        <p class="hero-copy">{{ copy.description }}</p>
        <div class="hero-actions">
          <el-button type="primary" size="large" @click="startProject">{{ copy.startProject }}</el-button>
          <el-button size="large" @click="scrollToLessons">{{ copy.viewLessons }}</el-button>
        </div>
      </section>

      <section class="outcomes" aria-label="学习成果">
        <article v-for="outcome in copy.outcomes" :key="outcome.title" class="outcome-item">
          <strong>{{ outcome.title }}</strong>
          <span>{{ outcome.body }}</span>
        </article>
      </section>

      <section id="academy-lessons" class="academy-grid">
        <aside class="lesson-list" aria-label="课程列表">
          <button
            v-for="lesson in copy.lessons"
            :key="lesson.id"
            type="button"
            class="lesson-nav-item"
            :class="{ active: lesson.id === activeLesson.id }"
            @click="selectLesson(lesson.id)"
          >
            <span class="lesson-number">{{ lesson.id }}</span>
            <span>
              <strong>{{ lesson.title }}</strong>
              <small>{{ lesson.goal }}</small>
            </span>
          </button>
        </aside>

        <article class="lesson-reader">
          <div class="lesson-kicker">{{ copy.lessonLabel }} {{ activeLesson.id }}</div>
          <h2>{{ activeLesson.title }}</h2>
          <p class="lesson-goal">{{ activeLesson.goal }}</p>

          <section v-for="section in activeLesson.sections" :key="section.heading" class="lesson-section">
            <h3>{{ section.heading }}</h3>
            <p v-if="section.body">{{ section.body }}</p>
            <ul v-if="section.items?.length">
              <li v-for="item in section.items" :key="item">{{ item }}</li>
            </ul>
          </section>
        </article>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

type LessonSection = {
  heading: string
  body?: string
  items?: string[]
}

type Lesson = {
  id: number
  title: string
  goal: string
  sections: LessonSection[]
}

type AcademyCopy = {
  eyebrow: string
  title: string
  description: string
  startProject: string
  viewLessons: string
  workspace: string
  lessonLabel: string
  outcomes: Array<{ title: string; body: string }>
  lessons: Lesson[]
}

const route = useRoute()
const router = useRouter()
const academyCopy: AcademyCopy = {
  eyebrow: '创作者学院',
  title: 'Wristo Studio 使用教程',
  description: '面向设计师的 Studio 操作课程，按真实制作流程学习如何新建项目、编辑画布、添加元素、绑定数据、预览设备并导出表盘。',
  startProject: '进入 Studio',
  viewLessons: '查看课程',
  workspace: '工作台',
  lessonLabel: '课程',
  outcomes: [
    { title: '熟悉 Studio 工作区', body: '了解项目列表、创建设计、画布、顶部工具栏、属性面板和保存流程。' },
    { title: '掌握表盘制作操作', body: '学习添加时间、文字、图形、图片、字体、图标和 Garmin 数据字段。' },
    { title: '完成可交付项目', body: '能检查设备预览、处理多尺寸适配、保存版本、导出文件并准备商店展示资料。' },
  ],
  lessons: [
    {
      id: 1,
      title: '进入 Studio 并创建项目',
      goal: '完成登录、进入工作台、创建第一个 Garmin 表盘项目。',
      sections: [
        { heading: '进入工作台', items: ['打开 Wristo Studio。', '登录 Wristo 账号。', '进入项目列表或新项目入口。', '确认当前账号可以保存和导出项目。'] },
        { heading: '创建项目', items: ['点击新建项目。', '选择空白项目或可用模板。', '填写项目名称。', '选择第一个目标 Garmin 设备或屏幕尺寸。'] },
        { heading: '第一次保存', items: ['进入画布后先保存一次项目。', '确认项目出现在工作台列表中。', '后续每完成一个阶段都保存，避免丢失设计进度。'] },
      ],
    },
    {
      id: 2,
      title: '认识编辑器界面',
      goal: '理解 Studio 编辑器里每个区域的用途，知道从哪里添加、选择和调整元素。',
      sections: [
        { heading: '主要区域', items: ['顶部栏：进入工作台、打开学院、切换设备和账户相关操作。', '工具菜单：保存、截图、添加时间、数据、图形、天气和帮助。', '画布区：查看当前设备上的表盘效果。', '属性面板：调整选中元素的位置、尺寸、颜色、字体和数据。'] },
        { heading: '常用操作', items: ['点击画布元素进行选择。', '拖动元素改变位置。', '使用属性面板做精确调整。', '用保存按钮提交当前设计。'] },
        { heading: '建议习惯', items: ['先选中元素，再看右侧或属性区可调整的内容。', '不要一次添加太多元素，先完成基础结构。', '每次大调整后保存并预览。'] },
      ],
    },
    {
      id: 3,
      title: '设置设备和画布',
      goal: '学会选择目标设备，并根据设备屏幕建立可编辑的表盘画布。',
      sections: [
        { heading: '选择设备', items: ['在设备选择入口中选择主要 Garmin 型号。', '先用一个主设备完成设计，不要一开始适配所有设备。', '注意圆形、方形和不同分辨率的差异。'] },
        { heading: '理解画布', items: ['画布显示的是当前设备的表盘区域。', '屏幕边缘附近的内容容易被裁切或看不清。', '重要信息优先放在更稳定、更容易阅读的位置。'] },
        { heading: '检查边界', items: ['时间、文字、图标不要贴边。', '圆形屏幕要特别检查四角和外圈区域。', '切换设备后重新检查元素位置。'] },
      ],
    },
    {
      id: 4,
      title: '添加时间、文字和基础图形',
      goal: '掌握最常用的表盘元素添加方式，搭出第一版可读布局。',
      sections: [
        { heading: '添加时间', items: ['从时间相关菜单添加时间元素。', '选择适合的时间格式。', '调整时间的位置、大小、颜色和字体。', '确保时间是画面中最容易读到的信息。'] },
        { heading: '添加文字', items: ['添加日期、标签或说明文字。', '保持文字内容短，避免小屏幕上拥挤。', '用字号和颜色区分主次，而不是让所有文字一样醒目。'] },
        { heading: '添加基础图形', items: ['使用形状或线条做分区、装饰和信息承载。', '调整填充、描边、透明度和层级。', '避免图形遮挡时间和关键数据。'] },
      ],
    },
    {
      id: 5,
      title: '使用字体、图标和图片素材',
      goal: '学会在 Studio 中使用视觉素材，并保持表盘风格统一。',
      sections: [
        { heading: '字体使用', items: ['进入字体相关功能选择可用字体。', '为时间数字优先选择清晰、稳定的字体。', '同一个表盘不要混用太多字体。', '测试 00:00、01:11、10:24、12:58、23:59 等时间。'] },
        { heading: '图标使用', items: ['从图标库选择和数据含义匹配的图标。', '保持图标大小、线条粗细和风格一致。', '图标要帮助用户识别信息，不要只是装饰。'] },
        { heading: '图片素材', items: ['上传或选择背景、纹理和装饰图片。', '图片不要压住时间和关键数据。', '检查图片在手表尺寸下是否清晰。', '确认素材授权可用于发布。'] },
      ],
    },
    {
      id: 6,
      title: '绑定 Garmin 数据字段',
      goal: '添加步数、心率、电量、天气等动态数据，并检查不同状态下的显示效果。',
      sections: [
        { heading: '添加数据字段', items: ['从数据字段菜单选择电量、步数、心率等信息。', '把数据字段放在不会干扰时间的位置。', '为数据添加简短标签或清晰图标。', '同一组数据保持对齐和间距一致。'] },
        { heading: '常见数据', items: ['电量：适合放在边缘或状态区。', '步数：数字可能较长，要预留宽度。', '心率：要考虑缺失或未连接状态。', '天气：需要检查图标、温度和文字是否拥挤。'] },
        { heading: '状态测试', items: ['测试低电量和满电量。', '测试步数 0、8,532、18,240。', '测试心率 --、72、148。', '检查数据变化时版式是否跳动。'] },
      ],
    },
    {
      id: 7,
      title: '调整图层、对齐和细节',
      goal: '用 Studio 的编辑能力整理元素层级，让表盘看起来有秩序。',
      sections: [
        { heading: '图层关系', items: ['背景放在底层。', '装饰元素不要盖住时间和数据。', '选不中元素时，先检查是否被其它元素遮挡。', '必要时调整元素前后层级。'] },
        { heading: '对齐和间距', items: ['同类数据使用一致的对齐方式。', '图标和文字之间保持固定间距。', '上下左右留白尽量形成统一规则。', '不要靠肉眼微调所有元素，优先使用数值和对齐。'] },
        { heading: '细节检查', items: ['颜色对比是否足够。', '小字号是否仍然可读。', '背景是否干扰数字。', '不同元素的圆角、线条和透明度是否统一。'] },
      ],
    },
    {
      id: 8,
      title: '预览设备、保存和导出',
      goal: '在导出前用 Studio 检查真实状态，确认当前版本可以交付。',
      sections: [
        { heading: '设备预览', items: ['在主设备上检查整体效果。', '切换相近尺寸设备查看是否裁切。', '检查圆形和方形设备上的边缘区域。', '截图记录当前版本效果。'] },
        { heading: '保存项目', items: ['导出前先保存。', '大改版前后分别保存，方便回溯。', '确认项目名称和设备选择正确。', '保存后回到工作台确认项目仍可打开。'] },
        { heading: '导出准备', items: ['移除不需要的素材或测试元素。', '确认字体和图片可以发布。', '检查时间、日期、数据字段和背景都来自最新版本。', '导出后再打开文件或预览图确认没有明显错误。'] },
      ],
    },
    {
      id: 9,
      title: '准备上架资料和后续更新',
      goal: '把 Studio 中完成的设计整理成可发布、可维护的表盘项目。',
      sections: [
        { heading: '上架资料', items: ['准备清晰的预览图。', '填写简短、容易理解的表盘名称。', '写清楚适合的使用场景。', '选择和设计风格、数据功能匹配的标签。'] },
        { heading: '交付检查', items: ['确认支持设备列表。', '记录使用的字体、图片和特殊素材。', '保留 Studio 源项目，方便后续修改。', '导出文件和预览图保持一致。'] },
        { heading: '后续更新', items: ['根据用户反馈优先修复可读性和裁切问题。', '新增设备前先复制并测试主设计。', '每次更新后重新保存和导出。', '不要在未检查真实设备效果前发布大改动。'] },
      ],
    },
  ],
}

const copy = computed(() => academyCopy)
const activeLesson = computed(() => {
  const lessonParam = Number(route.query.lesson || 1)
  return copy.value.lessons.find((lesson) => lesson.id === lessonParam) || copy.value.lessons[0]
})

const selectLesson = (lesson: number) => {
  router.replace({ path: '/academy', query: { lesson } })
}

const startProject = () => {
  router.push('/designs/new-projects')
}

const scrollToLessons = () => {
  document.getElementById('academy-lessons')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

onMounted(() => {
  document.title = `${copy.value.eyebrow} - Wristo Studio`
})
</script>

<style scoped>
.academy-page {
  min-height: 100%;
  background: var(--studio-bg);
  color: var(--studio-text);
}

.academy-topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 58px;
  padding: 0 24px;
  background: color-mix(in srgb, var(--studio-surface-raised) 94%, transparent);
  border-bottom: 1px solid var(--studio-border);
  backdrop-filter: saturate(160%) blur(14px);
}

.academy-brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 0;
  color: var(--studio-text);
  font: inherit;
  font-weight: 700;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.academy-brand:hover {
  color: var(--studio-primary);
}

.academy-logo {
  width: 28px;
  height: 28px;
  display: block;
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.academy-shell {
  width: min(1180px, calc(100% - 32px));
  margin: 0 auto;
  padding: 44px 0 64px;
}

.academy-hero {
  padding: 32px 0 24px;
  max-width: 780px;
}

.eyebrow,
.lesson-kicker {
  margin: 0 0 12px;
  color: var(--studio-primary);
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0;
}

.academy-hero h1 {
  margin: 0;
  font-size: clamp(36px, 6vw, 64px);
  line-height: 1.02;
  letter-spacing: 0;
}

.hero-copy {
  margin: 18px 0 0;
  max-width: 680px;
  color: var(--studio-text-muted);
  font-size: 18px;
  line-height: 1.7;
}

.hero-actions {
  margin-top: 26px;
}

.outcomes {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 26px 0 28px;
}

.outcome-item {
  display: flex;
  min-height: 116px;
  flex-direction: column;
  gap: 10px;
  padding: 18px;
  background: var(--studio-surface);
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-md);
}

.outcome-item span {
  color: var(--studio-text-muted);
  line-height: 1.55;
}

.academy-grid {
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.lesson-list {
  position: sticky;
  top: 74px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: calc(100vh - 96px);
  overflow-y: auto;
  padding-right: 4px;
}

.lesson-nav-item {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 12px;
  width: 100%;
  padding: 12px;
  text-align: left;
  color: var(--studio-text);
  background: var(--studio-surface);
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-md);
  cursor: pointer;
}

.lesson-nav-item:hover,
.lesson-nav-item.active {
  border-color: var(--studio-primary);
  background: var(--studio-primary-soft);
}

.lesson-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  color: var(--studio-primary);
  background: var(--studio-surface);
  border: 1px solid var(--studio-primary-border);
  border-radius: 50%;
  font-weight: 700;
}

.lesson-nav-item strong,
.lesson-nav-item small {
  display: block;
}

.lesson-nav-item strong {
  line-height: 1.35;
}

.lesson-nav-item small {
  margin-top: 4px;
  color: var(--studio-text-muted);
  line-height: 1.45;
}

.lesson-reader {
  min-height: 640px;
  padding: 28px;
  background: var(--studio-surface);
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-md);
  box-shadow: var(--studio-shadow-sm);
}

.lesson-reader h2 {
  margin: 0;
  font-size: 32px;
  line-height: 1.18;
  letter-spacing: 0;
}

.lesson-goal {
  margin: 12px 0 28px;
  color: var(--studio-text-muted);
  font-size: 17px;
  line-height: 1.65;
}

.lesson-section {
  padding: 20px 0;
  border-top: 1px solid var(--studio-border);
}

.lesson-section h3 {
  margin: 0 0 10px;
  font-size: 18px;
}

.lesson-section p,
.lesson-section li {
  color: var(--studio-text-muted);
  line-height: 1.7;
}

.lesson-section ul {
  margin: 0;
  padding-left: 20px;
}

.lesson-section li + li {
  margin-top: 8px;
}

@media (max-width: 900px) {
  .academy-topbar {
    padding: 0 16px;
  }

  .academy-grid,
  .outcomes {
    grid-template-columns: 1fr;
  }

  .lesson-list {
    position: static;
    max-height: none;
  }

  .academy-hero h1 {
    font-size: 38px;
  }
}
</style>
