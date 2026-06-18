<template>
  <div class="academy-page">
    <header class="academy-topbar">
      <button type="button" class="academy-brand" @click="startProject">
        <img src="https://cdn.wristo.io/brands/wristo-logo/svg/wristo-mark.svg" alt="" class="academy-logo">
        <span>Wristo Studio</span>
      </button>
      <div class="academy-topbar-actions">
        <LanguageSwitcher :locales="academyLocales" />
        <el-button type="primary" @click="startProject">{{ copy.startProject }}</el-button>
      </div>
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

      <section class="outcomes" :aria-label="copy.outcomesLabel">
        <article v-for="outcome in copy.outcomes" :key="outcome.title" class="outcome-item">
          <strong>{{ outcome.title }}</strong>
          <span>{{ outcome.body }}</span>
        </article>
      </section>

      <section id="academy-lessons" class="academy-grid">
        <aside class="lesson-list" :aria-label="copy.lessonsLabel">
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

          <div v-if="activeLesson.video" class="lesson-video">
            <iframe
              :src="activeLesson.video.src"
              :title="activeLesson.video.title"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerpolicy="strict-origin-when-cross-origin"
              allowfullscreen
            ></iframe>
          </div>

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
import { computed, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
import { useI18n } from '@/i18n'
import type { SupportedLocale } from '@/stores/locale'

type LessonSection = {
  heading: string
  body?: string
  items?: string[]
}

type LessonVideo = {
  src: string
  title: string
}

type Lesson = {
  id: number
  title: string
  goal: string
  video?: LessonVideo
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
  outcomesLabel: string
  lessonsLabel: string
  outcomes: Array<{ title: string; body: string }>
  lessons: Lesson[]
}

const route = useRoute()
const router = useRouter()
const { locale } = useI18n()
const academyLocales = ['zh', 'en'] satisfies SupportedLocale[]

const zhAcademyCopy: AcademyCopy = {
  eyebrow: '创作者学院',
  title: 'Wristo Studio 使用教程',
  description: '面向设计师的 Studio 操作课程，按真实制作流程学习如何新建项目、编辑画布、添加元素、绑定数据、预览设备并导出表盘。',
  startProject: '进入 Studio',
  viewLessons: '查看课程',
  workspace: '工作台',
  lessonLabel: '课程',
  outcomesLabel: '学习成果',
  lessonsLabel: '课程列表',
  outcomes: [
    { title: '熟悉 Studio 工作区', body: '了解项目列表、创建设计、画布、顶部工具栏、属性面板和保存流程。' },
    { title: '掌握表盘制作操作', body: '认识表盘元素类别，学习使用图层、对齐、素材、Garmin 数据字段和导出流程。' },
    { title: '完成可交付项目', body: '能检查设备预览、处理多尺寸适配、保存版本、导出文件并准备商店展示资料。' },
  ],
  lessons: [
    {
      id: 1,
      title: '进入 Studio 并创建项目',
      goal: '从登录 Studio 开始，创建第一个 Garmin 表盘项目，进入编辑器并保存第一张项目卡片。',
      video: {
        src: 'https://www.youtube.com/embed/ojxoE1SilZo?si=-3FomajP54jAS7L4',
        title: 'Create your first Garmin watch face project in Wristo Studio',
      },
      sections: [
        { heading: '登录并进入项目列表', items: ['打开 Wristo Studio 登录页。', '输入账号信息并登录 Studio。', '进入 My Projects 页面，准备创建新的表盘设计。'] },
        { heading: '新建 Garmin 表盘项目', items: ['在 My Projects 中点击 New Project。', '输入项目名称，使用容易识别的名称管理后续版本。', '选择目标 Garmin 设备型号，让画布尺寸匹配要制作的手表屏幕。', '确认创建项目并进入 Studio 编辑器。'] },
        { heading: '完成第一张项目卡片', items: ['在编辑器中先查看 Garmin watch 预览区域。', '添加时间元素，并把时间调整到表盘中间。', '保存当前设计。', '返回 My Projects，确认新创建的 watch face 卡片已经出现在项目列表中。'] },
      ],
    },
    {
      id: 2,
      title: '安装表盘到 Garmin 手表',
      goal: '从 Wristo Studio 构建 PRG 文件，并通过 USB 复制到 Garmin 手表的 GARMIN / APPS 文件夹完成真机安装测试。',
      video: {
        src: 'https://www.youtube.com/embed/y49SQN695a8?si=xjVZ57MSZtuX_RTS',
        title: 'Install face to Garmin device',
      },
      sections: [
        { heading: '准备可安装的项目', items: ['在 Wristo Studio 中完成第一版 watch face。', '上传配置并保存项目，确保当前设计已经写入项目。', '返回 My Projects，在项目列表中找到对应的应用卡片。'] },
        { heading: '构建并下载 PRG', items: ['在应用卡片上点击 Build PRG，开始打包 Garmin watch face。', '等待打包完成，不要在处理中重复触发构建。', '构建完成后点击下载图标，把 PRG 文件保存到电脑本地。', '在 Finder 中确认已经能看到下载好的 PRG 文件。'] },
        { heading: '复制到 Garmin 手表', items: ['用 USB 数据线把 Garmin watch 连接到电脑。', '打开出现的 GARMIN 设备盘。', '进入 GARMIN 文件夹，再进入 APPS 文件夹。', '把下载好的 PRG 文件复制到 GARMIN / APPS。'] },
        { heading: '完成安装检查', items: ['复制完成后安全弹出 Garmin 设备盘。', '拔下手表并等待设备重新加载。', '在手表上确认 Wristo watch face 已经安装成功。', '本课用于本地 PRG 真机测试，不覆盖 Connect IQ Store 发布流程。'] },
      ],
    },
    {
      id: 3,
      title: '认识 Studio 画布编辑界面',
      goal: '了解 Studio 编辑器的左侧图层区、中间画布区和右侧设置区，学会通过“选择元素、查看画布、修改属性”的方式编辑表盘。',
      video: {
        src: 'https://www.youtube.com/embed/n2fBxBPqTj4?si=6oN8nJ2_dDtPi4tN',
        title: '认识 Studio 画布编辑界面',
      },
      sections: [
        { heading: '认识编辑器整体布局', items: ['Studio 编辑器主要由左侧图层区、中间画布区和右侧设置区组成。', '左侧帮助你选择和管理元素，中间用于直接查看和摆放设计，右侧用于修改选中元素的属性。', '先理解三个区域的分工，再开始添加复杂内容。'] },
        { heading: '左侧图层区', items: ['每添加一个时间、文字、图标、图片或图形元素，都会出现在左侧图层列表中。', '点击图层可以快速选中对应元素。', '通过图层列表可以理解元素的前后关系，知道哪些内容可能盖住其它内容。'] },
        { heading: '中间画布区', items: ['画布是表盘设计的主要操作区域，显示最终会出现在手表上的内容。', '可以在画布中拖动元素，观察它们和中心、边缘之间的距离。', '时间等主要信息适合优先放在更清晰、更稳定的位置。'] },
        { heading: '右侧设置区和属性面板', items: ['选中元素后，右侧会显示它对应的设置项。', '常见属性包括位置、尺寸、颜色、字体、透明度、填充和描边。', '不同元素会出现不同属性，例如时间有格式和字体，文字有内容和字号，图形有填充和描边，图片有尺寸和透明度。'] },
        { heading: '本课练习', items: ['在画布中选中一个时间元素。', '观察左侧图层列表中对应图层的选中状态。', '在右侧属性面板调整位置、字号或颜色。', '回到画布确认修改后的显示效果是否清晰。'] },
      ],
    },
    {
      id: 4,
      title: '表盘元素介绍',
      goal: '认识 Studio 元素区的主要类别，理解不同元素在表盘设计中的作用，并学会先从合适的元素类型开始搭建布局。',
      sections: [
        { heading: '元素区的作用', items: ['添加元素面板是搭建表盘内容的入口。', '元素区按类别组织，不同类别对应不同设计用途。', '添加元素后，右侧属性面板会根据元素类型显示对应设置。'] },
        { heading: '基础信息元素', items: ['Time：包含时间和日期，是大多数表盘最核心的信息。', 'Texts：包含普通文字、滚动文字、倾斜文字和环形文字，适合标题、标签、说明和特殊排版。', 'Metric：包含图标、数据和标签，常用于组合步数、心率等信息块。'] },
        { heading: '状态和环境元素', items: ['Status：包含电量和 move bar，用于展示设备状态。', 'Indicator：包含蓝牙、勿扰、闹钟和通知，用于展示连接和提醒状态。', 'Weather：包含天气、月相和风向，用于展示环境信息。'] },
        { heading: '视觉结构元素', items: ['Decoration：包含背景和图片，用于建立表盘整体视觉氛围。', 'Shape：包含矩形、圆形和线条，适合做分区、装饰和信息承载。', 'Dials 和 Hands：包含刻度、罗马数字、中心盖、时针、分针和秒针，用于模拟指针表盘结构。'] },
        { heading: '进度和图表元素', items: ['Goal：包含目标进度条、弧形进度和分段进度，用于展示目标完成情况。', 'Chart：包含柱状图和折线图，用于展示更复杂的数据趋势。', '这类元素通常需要检查数据变化、缺失状态和小屏幕可读性。'] },
      ],
    },
    {
      id: 5,
      title: '图层和对齐排列方式介绍',
      goal: '掌握元素隐藏、锁定、删除、元素组、图层顺序、对齐方式和多个元素的快捷排列操作。',
      sections: [
        { heading: '图层基础操作', items: ['在左侧图层列表中选择元素，并观察画布中的选中状态。', '隐藏暂时不需要查看的元素，方便编辑被遮挡的内容。', '锁定背景、外圈装饰或已经确定位置的元素，避免误拖动。', '删除不再需要的测试文字、临时图形或多余图标。'] },
        { heading: '元素组和图层顺序', items: ['把相关元素作为一组理解，例如天气图标加温度文字、步数图标加数字。', '背景放在底层，装饰元素不要盖住时间和关键数据。', '当元素被遮挡或选不中时，先检查图层顺序。', '必要时把重要信息移到更靠上的层级。'] },
        { heading: '对齐和快捷排列', items: ['选中多个元素后使用左对齐、右对齐、水平居中、顶部对齐、底部对齐或垂直居中。', '同类数据使用一致的对齐方式。', '多个图标、文字或数据块需要整齐排列时，优先使用快捷排序操作。', '手动拖动适合微调，结构化排列优先使用对齐和排序工具。'] },
      ],
    },
    {
      id: 6,
      title: '使用字体、图标和图片素材',
      goal: '学会在 Studio 中使用视觉素材，并保持表盘风格统一。',
      sections: [
        { heading: '字体使用', items: ['进入字体相关功能选择可用字体。', '为时间数字优先选择清晰、稳定的字体。', '同一个表盘不要混用太多字体。', '测试 00:00、01:11、10:24、12:58、23:59 等时间。'] },
        { heading: '图标使用', items: ['从图标库选择和数据含义匹配的图标。', '保持图标大小、线条粗细和风格一致。', '图标要帮助用户识别信息，不要只是装饰。'] },
        { heading: '图片素材', items: ['上传或选择背景、纹理和装饰图片。', '图片不要压住时间和关键数据。', '检查图片在手表尺寸下是否清晰。', '确认素材授权可用于发布。'] },
      ],
    },
    {
      id: 7,
      title: '绑定 Garmin 数据字段',
      goal: '添加步数、心率、电量、天气等动态数据，并检查不同状态下的显示效果。',
      sections: [
        { heading: '添加数据字段', items: ['从数据字段菜单选择电量、步数、心率等信息。', '把数据字段放在不会干扰时间的位置。', '为数据添加简短标签或清晰图标。', '同一组数据保持对齐和间距一致。'] },
        { heading: '常见数据', items: ['电量：适合放在边缘或状态区。', '步数：数字可能较长，要预留宽度。', '心率：要考虑缺失或未连接状态。', '天气：需要检查图标、温度和文字是否拥挤。'] },
        { heading: '状态测试', items: ['测试低电量和满电量。', '测试步数 0、8,532、18,240。', '测试心率 --、72、148。', '检查数据变化时版式是否跳动。'] },
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

const enAcademyCopy: AcademyCopy = {
  eyebrow: 'Creator Academy',
  title: 'Wristo Studio Tutorial',
  description: 'Studio lessons for designers. Learn the real production flow: create a project, edit the canvas, add elements, bind data, preview devices, and export a watch face.',
  startProject: 'Open Studio',
  viewLessons: 'View Lessons',
  workspace: 'Workspace',
  lessonLabel: 'Lesson',
  outcomesLabel: 'Learning outcomes',
  lessonsLabel: 'Lesson list',
  outcomes: [
    { title: 'Understand the Studio workspace', body: 'Learn the project list, design creation, canvas, top toolbar, properties panel, and save flow.' },
    { title: 'Build watch face layouts', body: 'Learn element categories, layers, alignment, assets, Garmin data fields, and export flow.' },
    { title: 'Finish a deliverable project', body: 'Check device previews, handle multiple sizes, save versions, export files, and prepare store assets.' },
  ],
  lessons: [
    {
      id: 1,
      title: 'Enter Studio and create a project',
      goal: 'Start from the Studio sign-in page, create your first Garmin watch face project, enter the editor, and save the first project card.',
      video: {
        src: 'https://www.youtube.com/embed/ojxoE1SilZo?si=-3FomajP54jAS7L4',
        title: 'Create your first Garmin watch face project in Wristo Studio',
      },
      sections: [
        { heading: 'Sign in and open My Projects', items: ['Open the Wristo Studio sign-in page.', 'Enter your account details and sign in to Studio.', 'Go to My Projects and get ready to create a new watch face design.'] },
        { heading: 'Create a Garmin watch face project', items: ['Click New Project in My Projects.', 'Enter a project name that will be easy to recognize later.', 'Select the target Garmin device model so the canvas matches the watch screen.', 'Confirm project creation and enter the Studio editor.'] },
        { heading: 'Finish the first project card', items: ['Check the Garmin watch preview area in the editor.', 'Add a time element and adjust it to the center of the watch face.', 'Save the current design.', 'Return to My Projects and confirm that the new watch face card appears in the project list.'] },
      ],
    },
    {
      id: 2,
      title: 'Install a watch face on a Garmin device',
      goal: 'Build a PRG file in Wristo Studio, then copy it over USB into the Garmin watch GARMIN / APPS folder for real-device testing.',
      video: {
        src: 'https://www.youtube.com/embed/y49SQN695a8?si=xjVZ57MSZtuX_RTS',
        title: 'Install face to Garmin device',
      },
      sections: [
        { heading: 'Prepare an installable project', items: ['Finish the first version of your watch face in Wristo Studio.', 'Upload the configuration and save the project so the latest design is stored.', 'Return to My Projects and find the app card for this watch face.'] },
        { heading: 'Build and download the PRG', items: ['Click Build PRG on the app card to package the Garmin watch face.', 'Wait for packaging to finish before starting another build.', 'When the build is complete, click the download icon to save the PRG file locally.', 'Confirm the downloaded PRG file is visible in Finder.'] },
        { heading: 'Copy it to the Garmin watch', items: ['Connect the Garmin watch to your computer with a USB data cable.', 'Open the GARMIN drive when it appears.', 'Open the GARMIN folder, then open APPS.', 'Copy the downloaded PRG file into GARMIN / APPS.'] },
        { heading: 'Finish the installation check', items: ['Safely eject the Garmin drive after the copy finishes.', 'Unplug the watch and let the device reload.', 'Confirm the Wristo watch face is installed on the watch.', 'This lesson is for local PRG testing and does not cover Connect IQ Store publishing.'] },
      ],
    },
    {
      id: 3,
      title: 'Understand the Studio canvas editor',
      goal: 'Learn the left layer panel, center canvas, and right settings area, then edit a watch face by selecting an element, checking the canvas, and changing its properties.',
      video: {
        src: 'https://www.youtube.com/embed/n2fBxBPqTj4?si=6oN8nJ2_dDtPi4tN',
        title: 'Understand the Studio canvas editor',
      },
      sections: [
        { heading: 'Know the editor layout', items: ['The Studio editor is mainly split into the left layer panel, the center canvas, and the right settings area.', 'The left side helps you select and manage elements, the center shows and positions the design, and the right side changes properties for the selected element.', 'Understand these three areas before adding more complex content.'] },
        { heading: 'Left layer panel', items: ['Every time, text, icon, image, or shape element you add appears in the layer list.', 'Click a layer to quickly select the matching element.', 'Use the layer list to understand front and back relationships and see which elements may cover others.'] },
        { heading: 'Center canvas', items: ['The canvas is the main design area and shows the content that will appear on the watch.', 'Drag elements on the canvas and watch their distance from the center and edge.', 'Primary information such as time should be placed in a clear and stable position first.'] },
        { heading: 'Right settings area and property panel', items: ['After selecting an element, the right side shows its settings.', 'Common properties include position, size, color, font, opacity, fill, and stroke.', 'Different elements show different properties: time has format and font, text has content and size, shapes have fill and stroke, and images have size and opacity.'] },
        { heading: 'Practice', items: ['Select a time element on the canvas.', 'Check the selected layer state in the left layer list.', 'Change position, font size, or color in the right property panel.', 'Return to the canvas and confirm that the updated display is still clear.'] },
      ],
    },
    {
      id: 4,
      title: 'Watch face elements overview',
      goal: 'Understand the main element categories in Studio and choose the right element types before building a watch face layout.',
      sections: [
        { heading: 'What the element panel does', items: ['The add element panel is the entry point for building watch face content.', 'Elements are organized by category, and each category supports a different design purpose.', 'After adding an element, the right settings panel shows controls for that element type.'] },
        { heading: 'Basic information elements', items: ['Time: time and date, usually the core information on a watch face.', 'Texts: normal text, scrolling text, angled text, and radial text for titles, labels, notes, and special layouts.', 'Metric: icons, data, and labels for information blocks such as steps or heart rate.'] },
        { heading: 'Status and environment elements', items: ['Status: battery and move bar for device state.', 'Indicator: Bluetooth, do not disturb, alarms, and notifications for connection and alert states.', 'Weather: weather, moon phase, and wind direction for environment information.'] },
        { heading: 'Visual structure elements', items: ['Decoration: backgrounds and images for the overall visual style.', 'Shape: rectangles, circles, and lines for grouping, decoration, and information support.', 'Dials and hands: ticks, Roman numerals, center cap, hour hand, minute hand, and second hand for analog-style faces.'] },
        { heading: 'Progress and chart elements', items: ['Goal: goal bars, goal arcs, and segmented progress for completion states.', 'Chart: bar charts and line charts for more complex data trends.', 'For these elements, check changing values, missing states, and readability on small screens.'] },
      ],
    },
    {
      id: 5,
      title: 'Layers and alignment arrangement',
      goal: 'Learn visibility, locking, deleting, element groups, layer order, alignment, and quick arrangement for multiple elements.',
      sections: [
        { heading: 'Basic layer operations', items: ['Select elements from the left layer list and watch the selected state on the canvas.', 'Hide elements temporarily when you need to edit content behind them.', 'Lock backgrounds, outer decorations, or elements whose positions are already finished.', 'Delete test text, temporary shapes, or extra icons that are no longer needed.'] },
        { heading: 'Groups and layer order', items: ['Treat related elements as a group, such as a weather icon with temperature text or a steps icon with a number.', 'Keep backgrounds at the bottom and prevent decorative elements from covering time or key data.', 'If an element is covered or hard to select, check the layer order first.', 'Move important information to a higher layer when needed.'] },
        { heading: 'Alignment and quick arrangement', items: ['Select multiple elements and use left, right, center, top, bottom, or vertical center alignment.', 'Use consistent alignment for similar data.', 'When several icons, text labels, or data blocks need to be organized, prefer quick arrangement tools.', 'Use manual dragging for small adjustments, and use alignment or arrangement for structure.'] },
      ],
    },
    {
      id: 6,
      title: 'Use fonts, icons, and images',
      goal: 'Use visual assets in Studio while keeping the watch face style consistent.',
      sections: [
        { heading: 'Use fonts', items: ['Open the font feature and choose an available font.', 'Prioritize clear, stable fonts for time digits.', 'Avoid mixing too many fonts in one watch face.', 'Test times such as 00:00, 01:11, 10:24, 12:58, and 23:59.'] },
        { heading: 'Use icons', items: ['Choose icons that match the meaning of the data.', 'Keep icon size, stroke weight, and style consistent.', 'Icons should help users recognize information, not only decorate the screen.'] },
        { heading: 'Use images', items: ['Upload or choose backgrounds, textures, and decorative images.', 'Images should not cover time or key data.', 'Check whether images are still clear at watch size.', 'Confirm that the asset license allows publishing.'] },
      ],
    },
    {
      id: 7,
      title: 'Bind Garmin data fields',
      goal: 'Add dynamic data such as steps, heart rate, battery, and weather, then check different display states.',
      sections: [
        { heading: 'Add data fields', items: ['Choose battery, steps, heart rate, or other information from the data field menu.', 'Place data fields where they do not interfere with time.', 'Add short labels or clear icons for the data.', 'Keep alignment and spacing consistent within the same data group.'] },
        { heading: 'Common data', items: ['Battery: suitable for edges or status areas.', 'Steps: numbers can become long, so reserve enough width.', 'Heart rate: consider missing or disconnected states.', 'Weather: check whether icons, temperature, and text become crowded.'] },
        { heading: 'State testing', items: ['Test low and full battery.', 'Test steps 0, 8,532, and 18,240.', 'Test heart rate --, 72, and 148.', 'Check whether the layout jumps when data changes.'] },
      ],
    },
    {
      id: 8,
      title: 'Preview devices, save, and export',
      goal: 'Use Studio to check real states before export and confirm the current version is deliverable.',
      sections: [
        { heading: 'Device preview', items: ['Check the overall result on the main device.', 'Switch to nearby device sizes to check cropping.', 'Check edge areas on round and square devices.', 'Take screenshots to record the current version.'] },
        { heading: 'Save the project', items: ['Save before exporting.', 'Save before and after major revisions for easier rollback.', 'Confirm that the project name and device selection are correct.', 'After saving, return to the workspace and confirm the project can still open.'] },
        { heading: 'Export preparation', items: ['Remove unused assets or test elements.', 'Confirm fonts and images can be published.', 'Check that time, date, data fields, and background all come from the latest version.', 'After export, open the file or preview image again to catch obvious issues.'] },
      ],
    },
    {
      id: 9,
      title: 'Prepare store assets and future updates',
      goal: 'Organize the finished Studio design into a publishable and maintainable watch face project.',
      sections: [
        { heading: 'Store assets', items: ['Prepare clear preview images.', 'Enter a short, easy-to-understand watch face name.', 'Describe the usage scenarios clearly.', 'Choose tags that match the design style and data features.'] },
        { heading: 'Delivery checks', items: ['Confirm the supported device list.', 'Record fonts, images, and special assets used by the design.', 'Keep the Studio source project for future edits.', 'Keep exported files consistent with preview images.'] },
        { heading: 'Future updates', items: ['Prioritize readability and cropping issues from user feedback.', 'Before adding new devices, duplicate and test the main design first.', 'Save and export again after every update.', 'Do not publish large changes before checking the real device result.'] },
      ],
    },
  ],
}

const academyCopy = computed(() => (locale.value === 'zh' || locale.value === 'zh-tw' ? zhAcademyCopy : enAcademyCopy))
const copy = computed(() => academyCopy.value)
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

watchEffect(() => {
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

.academy-topbar-actions {
  display: inline-flex;
  align-items: center;
  gap: 10px;
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

.lesson-video {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  margin: 0 0 28px;
  overflow: hidden;
  background: #000000;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-md);
}

.lesson-video iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
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

  .academy-topbar-actions {
    gap: 6px;
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
