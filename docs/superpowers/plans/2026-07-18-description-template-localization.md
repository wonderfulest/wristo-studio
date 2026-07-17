# Description Template Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为设计师描述模板及两个发布入口增加英文、中文选择，并由后端按显式语言生成描述，同时保持旧模板为英文。

**Architecture:** 保留 `description_template` 作为英文模板，新增 `description_template_zh` 贯穿数据库、配置 DTO/VO 与 Mapper。生成描述请求增加 `language`，后端只在 `zh` 时选择中文，其余情况选择英文；前端设置页用 Tabs 编辑两份模板，两个发布入口用同一请求构造函数显式发送语言。

**Tech Stack:** Java 17、Spring Boot、MyBatis XML、Flyway、JUnit 5、Vue 3、TypeScript、Element Plus、Vitest、Vite

## Global Constraints

- 现有 `description_template` 内容统一视为英文模板，不能迁移或覆盖。
- 当前仅支持语言代码 `en` 与 `zh`。
- 发布页语言切换不能自动覆盖当前描述；只有点击刷新才生成描述。
- 中文模板为空时返回空字符串，不回退英文。
- 产品仍保存单一 Description，本次不修改产品描述数据模型。
- Wristo 内部文档使用中文，用户界面文案保持英文/中文本地化。

---

### Task 1: 后端配置模型支持中文模板

**Files:**
- Create: `/Users/mac/workspace/wristo/wristo-api/src/main/resources/db/migration/V42__designer_description_template_zh.sql`
- Modify: `/Users/mac/workspace/wristo/wristo-api/src/main/java/com/wukong/face/modules/design/entity/DesignerDefaultConfig.java`
- Modify: `/Users/mac/workspace/wristo/wristo-api/src/main/java/com/wukong/face/modules/design/dto/DesignerDefaultConfigCreateDTO.java`
- Modify: `/Users/mac/workspace/wristo/wristo-api/src/main/java/com/wukong/face/modules/design/dto/DesignerDefaultConfigUpdateDTO.java`
- Modify: `/Users/mac/workspace/wristo/wristo-api/src/main/java/com/wukong/face/modules/design/vo/DesignerDefaultConfigVO.java`
- Modify: `/Users/mac/workspace/wristo/wristo-api/src/main/java/com/wukong/face/modules/design/converter/DesignerDefaultConfigConverter.java`
- Modify: `/Users/mac/workspace/wristo/wristo-api/src/main/resources/mapper/DesignerDefaultConfigMapper.xml`
- Test: `/Users/mac/workspace/wristo/wristo-api/src/test/java/com/wukong/face/modules/design/converter/DesignerDefaultConfigConverterTest.java`

**Interfaces:**
- Consumes: 现有 `descriptionTemplate: String` 英文模板契约。
- Produces: `descriptionTemplateZh: String`，在 Entity、Create/Update DTO、VO 及 API JSON 中名称一致。

- [ ] **Step 1: 写转换器失败测试**

创建 `DesignerDefaultConfigConverterTest`，分别断言 create DTO 到 Entity、Update DTO 合并、Entity 到 VO 都保留 `descriptionTemplateZh = "中文模板"`。

```java
@Test
void preservesChineseDescriptionTemplateAcrossConversions() {
    DesignerDefaultConfigCreateDTO create = new DesignerDefaultConfigCreateDTO();
    create.setUserId(7L);
    create.setDescriptionTemplate("English template");
    create.setDescriptionTemplateZh("中文模板");

    DesignerDefaultConfig entity = DesignerDefaultConfigConverter.toEntity(create);

    assertEquals("English template", entity.getDescriptionTemplate());
    assertEquals("中文模板", entity.getDescriptionTemplateZh());
    assertEquals("中文模板", DesignerDefaultConfigConverter.toVO(entity).getDescriptionTemplateZh());
}
```

- [ ] **Step 2: 运行测试确认因缺少字段而失败**

Run: `cd /Users/mac/workspace/wristo/wristo-api && mvn -Dtest=DesignerDefaultConfigConverterTest test`

Expected: 编译失败，提示 `setDescriptionTemplateZh` 或 `getDescriptionTemplateZh` 不存在。

- [ ] **Step 3: 增加数据库列和全链路字段**

迁移文件内容：

```sql
ALTER TABLE designer_default_config
    ADD COLUMN description_template_zh TEXT NULL COMMENT '中文作品描述模板'
    AFTER description_template;
```

在四个 Java 模型类增加 `private String descriptionTemplateZh;`；Converter 的 `toEntity`、`merge`、`toVO` 增加对应赋值。Mapper 的 resultMap、列清单、insert 列和值及 update `<set>` 增加 `description_template_zh`。

- [ ] **Step 4: 运行转换器测试确认通过**

Run: `cd /Users/mac/workspace/wristo/wristo-api && mvn -Dtest=DesignerDefaultConfigConverterTest test`

Expected: `BUILD SUCCESS`，该测试无失败。

- [ ] **Step 5: 提交后端配置模型改动**

Run: `cd /Users/mac/workspace/wristo/wristo-api && git add src/main/resources/db/migration/V42__designer_description_template_zh.sql src/main/java/com/wukong/face/modules/design src/main/resources/mapper/DesignerDefaultConfigMapper.xml src/test/java/com/wukong/face/modules/design/converter/DesignerDefaultConfigConverterTest.java && git commit -m "add Chinese designer description template"`

### Task 2: 生成描述接口按语言选择模板

**Files:**
- Modify: `/Users/mac/workspace/wristo/wristo-api/src/main/java/com/wukong/face/modules/products/dto/GenerateDescriptionDTO.java`
- Modify: `/Users/mac/workspace/wristo/wristo-api/src/main/java/com/wukong/face/modules/products/controller/dsn/ProductDsnController.java`
- Test: `/Users/mac/workspace/wristo/wristo-api/src/test/java/com/wukong/face/modules/products/controller/dsn/ProductDsnControllerTest.java`

**Interfaces:**
- Consumes: `DesignerDefaultConfigVO.getDescriptionTemplate()` 与 Task 1 的 `getDescriptionTemplateZh()`。
- Produces: `GenerateDescriptionDTO.language: String`；`POST /api/dsn/products/generate-description` 在 `zh` 时使用中文，其余情况使用英文。

- [ ] **Step 1: 写接口方法失败测试**

使用 Mockito mock `DesignerDefaultConfigService` 和 `VariableContextService`，通过 `ReflectionTestUtils` 注入直接测试 controller。测试用例覆盖 `null`、`en`、`zh`、`fr` 及空中文模板：

```java
GenerateDescriptionDTO dto = new GenerateDescriptionDTO();
dto.setUserId(7L);
dto.setProductId(9L);
dto.setLanguage("zh");

DesignerDefaultConfigVO config = new DesignerDefaultConfigVO();
config.setDescriptionTemplate("Hello [[${product_name}]]");
config.setDescriptionTemplateZh("你好 [[${product_name}]]");
when(configService.getByUserId(7L)).thenReturn(config);
when(variableContextService.buildContext(7L, 9L))
    .thenReturn(Map.of("product_name", "Wristo"));

assertEquals("你好 Wristo", controller.generateDescription(dto).getData());
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/mac/workspace/wristo/wristo-api && mvn -Dtest=ProductDsnControllerTest test`

Expected: 编译失败，提示 `GenerateDescriptionDTO.setLanguage` 不存在，或中文断言失败。

- [ ] **Step 3: 实现语言字段与模板选择**

DTO 增加：

```java
private String language;
```

Controller 在构造 Thymeleaf Engine 前选择模板：

```java
String template = null;
if (config != null) {
    template = "zh".equalsIgnoreCase(dto.getLanguage())
            ? config.getDescriptionTemplateZh()
            : config.getDescriptionTemplate();
}
if (template == null) {
    return Result.success("");
}
```

- [ ] **Step 4: 运行接口单元测试确认通过**

Run: `cd /Users/mac/workspace/wristo/wristo-api && mvn -Dtest=ProductDsnControllerTest test`

Expected: `BUILD SUCCESS`，英文、中文、缺省、无效语言和空模板用例全部通过。

- [ ] **Step 5: 提交后端描述生成改动**

Run: `cd /Users/mac/workspace/wristo/wristo-api && git add src/main/java/com/wukong/face/modules/products/dto/GenerateDescriptionDTO.java src/main/java/com/wukong/face/modules/products/controller/dsn/ProductDsnController.java src/test/java/com/wukong/face/modules/products/controller/dsn/ProductDsnControllerTest.java && git commit -m "generate product descriptions by language"`

### Task 3: 前端类型和统一请求构造函数

**Files:**
- Create: `/Users/mac/workspace/wristo/wristo-studio/src/utils/descriptionTemplateLanguage.ts`
- Create: `/Users/mac/workspace/wristo/wristo-studio/src/utils/descriptionTemplateLanguage.test.ts`
- Modify: `/Users/mac/workspace/wristo/wristo-studio/src/types/api/product.ts`
- Modify: `/Users/mac/workspace/wristo/wristo-studio/src/types/api/designer-default-config.ts`

**Interfaces:**
- Consumes: 后端 `language: en | zh` 与 `descriptionTemplateZh` JSON 字段。
- Produces: `DescriptionTemplateLanguage = 'en' | 'zh'` 和 `buildGenerateDescriptionPayload(userId, productId, language): GenerateDescriptionDto`。

- [ ] **Step 1: 写请求构造函数失败测试**

```ts
import { describe, expect, it } from 'vitest'
import { buildGenerateDescriptionPayload } from './descriptionTemplateLanguage'

describe('buildGenerateDescriptionPayload', () => {
  it('includes the explicitly selected language', () => {
    expect(buildGenerateDescriptionPayload(7, 9, 'zh')).toEqual({
      userId: 7,
      productId: 9,
      language: 'zh',
    })
  })
})
```

- [ ] **Step 2: 运行测试确认模块不存在**

Run: `cd /Users/mac/workspace/wristo/wristo-studio && npx vitest run src/utils/descriptionTemplateLanguage.test.ts`

Expected: FAIL，无法解析 `./descriptionTemplateLanguage`。

- [ ] **Step 3: 实现类型和构造函数**

```ts
import type { GenerateDescriptionDto } from '@/types/api/product'

export type DescriptionTemplateLanguage = 'en' | 'zh'

export const buildGenerateDescriptionPayload = (
  userId: number,
  productId: number,
  language: DescriptionTemplateLanguage,
): GenerateDescriptionDto => ({ userId, productId, language })
```

`GenerateDescriptionDto` 增加 `language: DescriptionTemplateLanguage`，Designer 配置三个接口增加 `descriptionTemplateZh`，VO 为 `string | null`，Create/Update 为可选 `string | null`。

- [ ] **Step 4: 运行工具测试确认通过**

Run: `cd /Users/mac/workspace/wristo/wristo-studio && npx vitest run src/utils/descriptionTemplateLanguage.test.ts`

Expected: 1 个测试文件通过。

- [ ] **Step 5: 提交前端类型与请求构造函数**

Run: `cd /Users/mac/workspace/wristo/wristo-studio && git add src/utils/descriptionTemplateLanguage.ts src/utils/descriptionTemplateLanguage.test.ts src/types/api/product.ts src/types/api/designer-default-config.ts && git commit -m "add description template language types"`

### Task 4: Designer Settings 增加中英文模板 Tabs

**Files:**
- Modify: `/Users/mac/workspace/wristo/wristo-studio/src/components/dialogs/DesignerDefaultConfigDialog.vue`
- Modify: `/Users/mac/workspace/wristo/wristo-studio/src/i18n.ts`

**Interfaces:**
- Consumes: Task 3 的 `descriptionTemplateZh` 前端配置字段。
- Produces: 设置弹窗中的 English/中文 Tab；create/update 请求同时保存两个模板。

- [ ] **Step 1: 扩展表单状态与 API 映射**

在 form 初始化中加入 `descriptionTemplateZh: null`，load 时读取该字段，create/update DTO 同时提交：

```ts
descriptionTemplate: form.descriptionTemplate,
descriptionTemplateZh: form.descriptionTemplateZh,
```

- [ ] **Step 2: 将单编辑器替换为 Tabs**

```vue
<el-tabs v-model="descriptionLanguage" class="description-template-tabs">
  <el-tab-pane :label="t('designerSettings.languageEnglish')" name="en">
    <TemplateTextEditor
      v-model="form.descriptionTemplate"
      :user-id="userStore.userInfo?.id || 0"
      :placeholder="t('designerSettings.descriptionPlaceholder')"
    />
  </el-tab-pane>
  <el-tab-pane :label="t('designerSettings.languageChinese')" name="zh">
    <TemplateTextEditor
      v-model="form.descriptionTemplateZh"
      :user-id="userStore.userInfo?.id || 0"
      :placeholder="t('designerSettings.descriptionPlaceholder')"
    />
  </el-tab-pane>
</el-tabs>
```

增加 `const descriptionLanguage = ref<'en' | 'zh'>('en')`，每次 `show()` 时重置为 `en`。补充宽度样式确保 Tabs 和编辑器占满表单内容区。

- [ ] **Step 3: 增加中英文 UI 文案**

英文 locale：`languageEnglish: English`、`languageChinese: Chinese`；中文 locale：`languageEnglish: 英文`、`languageChinese: 中文`。

- [ ] **Step 4: 运行 TypeScript 检查**

Run: `cd /Users/mac/workspace/wristo/wristo-studio && npm run typecheck`

Expected: `vue-tsc --noEmit` 退出码 0。

- [ ] **Step 5: 提交设置页双语言模板改动**

Run: `cd /Users/mac/workspace/wristo/wristo-studio && git add src/components/dialogs/DesignerDefaultConfigDialog.vue src/i18n.ts docs/superpowers/plans/2026-07-18-description-template-localization.md && git commit -m "add localized description template tabs"`

### Task 5: 两个发布入口增加语言选择

**Files:**
- Modify: `/Users/mac/workspace/wristo/wristo-studio/src/components/dialogs/GoLiveDialog.vue`
- Modify: `/Users/mac/workspace/wristo/wristo-studio/src/components/dialogs/SubmitDesignDialog.vue`
- Modify: `/Users/mac/workspace/wristo/wristo-studio/src/i18n.ts`

**Interfaces:**
- Consumes: Task 3 的 `DescriptionTemplateLanguage` 与 `buildGenerateDescriptionPayload`。
- Produces: 两个入口都提供 `English`/`中文` 单选控件，并向生成接口传显式语言。

- [ ] **Step 1: 为两个弹窗增加语言状态**

```ts
const descriptionLanguage = ref<DescriptionTemplateLanguage>('en')
```

每次 `show()` 时执行 `descriptionLanguage.value = 'en'`，保证默认英文。切换状态不设置 `form.description`。

- [ ] **Step 2: 在描述操作区增加语言单选按钮**

```vue
<el-radio-group v-model="descriptionLanguage" size="small">
  <el-radio-button value="en">{{ t('goLive.languageEnglish') }}</el-radio-button>
  <el-radio-button value="zh">{{ t('goLive.languageChinese') }}</el-radio-button>
</el-radio-group>
```

语言选择与刷新按钮放在同一操作行，并在窄屏允许换行。

- [ ] **Step 3: 两个刷新方法使用统一请求构造函数**

```ts
const payload = buildGenerateDescriptionPayload(uid, productId, descriptionLanguage.value)
const res = await productsApi.generateDescription(payload) as ApiResponse<string>
```

- [ ] **Step 4: 补充发布页本地化文案**

增加 `goLive.descriptionLanguage`、`goLive.languageEnglish`、`goLive.languageChinese` 的英文和中文值，用户界面显示与当前 Studio locale 一致。

- [ ] **Step 5: 运行前端测试和类型检查**

Run: `cd /Users/mac/workspace/wristo/wristo-studio && npx vitest run src/utils/descriptionTemplateLanguage.test.ts && npm run typecheck`

Expected: Vitest 通过，`vue-tsc --noEmit` 退出码 0。

- [ ] **Step 6: 提交发布页语言选择改动**

Run: `cd /Users/mac/workspace/wristo/wristo-studio && git add src/components/dialogs/GoLiveDialog.vue src/components/dialogs/SubmitDesignDialog.vue src/i18n.ts && git commit -m "select description language when publishing"`

### Task 6: 全量验证

**Files:**
- Verify only: `/Users/mac/workspace/wristo/wristo-api`
- Verify only: `/Users/mac/workspace/wristo/wristo-studio`

**Interfaces:**
- Consumes: Tasks 1-5 的完整实现。
- Produces: 后端测试和前端生产构建的最新验证证据。

- [ ] **Step 1: 检查两个仓库改动范围与补丁格式**

Run: `git -C /Users/mac/workspace/wristo/wristo-api status --short && git -C /Users/mac/workspace/wristo/wristo-api diff --check && git -C /Users/mac/workspace/wristo/wristo-studio status --short && git -C /Users/mac/workspace/wristo/wristo-studio diff --check`

Expected: 只有本功能相关文件，两个 `diff --check` 均无输出。

- [ ] **Step 2: 运行后端完整测试**

Run: `cd /Users/mac/workspace/wristo/wristo-api && mvn test`

Expected: `BUILD SUCCESS`，0 failures、0 errors。

- [ ] **Step 3: 运行前端生产构建**

Run: `cd /Users/mac/workspace/wristo/wristo-studio && npm run build`

Expected: `vue-tsc --noEmit` 与 Vite production build 均成功，退出码 0。

- [ ] **Step 4: 对照验收清单复核**

确认旧英文数据不变、设置页双 Tab、两个发布入口双语言选择、刷新请求携带语言、切换语言不改描述、中文空模板不回退英文。
