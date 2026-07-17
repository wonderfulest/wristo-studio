# 描述模板中英文支持设计

## 背景

Designer Settings 当前只保存一份 `descriptionTemplate`，发布页的“刷新描述”接口也只会使用这一份模板。现在需要在不改变现有英文数据语义的前提下，增加中文模板，并允许设计师在发布页面明确选择用英文或中文模板生成产品描述。

## 范围

- Designer Settings 的 Description Template 增加 `English` 和 `中文` 两个 Tab。
- 英文、中文模板分别编辑和保存，并继续支持模板变量、预览上下文等现有编辑器能力。
- `GoLiveDialog` 与 `SubmitDesignDialog` 增加英文、中文选择，刷新描述时使用所选语言的模板。
- 后端配置、接口和数据库结构支持两份模板。

本次不增加产品描述多语言存储。产品仍然只有一份当前待发布描述，语言选择仅决定“刷新描述”时使用哪一份模板。

## 数据模型与兼容性

保留现有数据库字段 `description_template`，继续将其作为英文模板。新增可空字段：

```text
description_template_zh TEXT NULL COMMENT '中文作品描述模板'
```

这样现有模板无需迁移，升级后会直接显示在 English Tab；中文模板初始为空。

后端 `DesignerDefaultConfig` 的 Entity、Create/Update DTO、VO、Converter 和 MyBatis Mapper 增加 `descriptionTemplateZh`。现有 `descriptionTemplate` 字段名和接口含义保持不变。

## Designer Settings 交互

Description Template 表单项内部使用 Element Plus Tabs：

- `English` Tab 绑定 `form.descriptionTemplate`。
- `中文` Tab 绑定 `form.descriptionTemplateZh`。
- 初始激活 English。
- 两个 Tab 各自渲染完整 `TemplateTextEditor`，共享同一组模板变量和当前用户上下文。
- 保存时在同一个 create/update 请求中提交两份模板。

语言 Tab 是模板内容语言，不跟随 Studio 界面语言自动切换；设计师可以随时明确编辑任一版本。

## 发布页交互

`GoLiveDialog` 和 `SubmitDesignDialog` 在描述编辑区域增加语言选择，提供 `English` 与 `中文`：

- 每次打开发布弹窗默认选择 English，保持现有行为。
- 语言选择不自动改写当前描述，避免切换时丢失用户手工编辑内容。
- 只有点击“刷新描述”时，才按当前选择向后端发送 `language`。
- 接口返回结果后，沿用现有行为覆盖当前描述输入框。
- 如果对应语言模板为空，返回空字符串，不自动回退另一语言，避免中文发布内容混入英文模板。

## 生成接口

`GenerateDescriptionDTO` 增加 `language` 字段。当前支持：

```text
en
zh
```

后端选择规则：

1. `language` 为 `zh` 时使用 `descriptionTemplateZh`。
2. `language` 为 `en`、为空或其他值时使用现有 `descriptionTemplate`。
3. 选中的模板为空时返回空字符串。
4. 模板变量解析流程保持不变。

前端 `GenerateDescriptionDto` 同步增加联合类型 `language?: 'en' | 'zh'`，两个发布入口都传入当前语言选择。

## 错误处理

- 配置不存在或所选模板为空时，生成接口成功返回空字符串，保持当前接口风格。
- 模板解析、网络请求和保存失败继续使用现有错误提示。
- 不在前端隐式复制英文模板到中文字段。

## 测试与验收

后端测试至少覆盖：

- 未传语言时仍生成英文描述。
- `en` 使用现有英文模板。
- `zh` 使用中文模板。
- 中文模板为空时返回空字符串。
- 无效语言回退英文。

前端测试或可独立测试的映射逻辑覆盖：

- 两份模板分别加载并提交。
- 两个发布入口都将所选语言传入生成描述接口。
- 切换语言不会自动覆盖当前描述。

完成后运行：

```bash
cd /Users/mac/workspace/wristo/wristo-api && mvn test
cd /Users/mac/workspace/wristo/wristo-studio && npm run build
```

手工验收：

1. 旧账号打开设置，旧模板出现在 English，中文为空。
2. 分别编辑并保存两种模板，重新打开后内容保持。
3. 发布页选择 English 后刷新，生成英文模板内容。
4. 发布页选择中文后刷新，生成中文模板内容。
5. 切换语言但不刷新时，当前描述内容不变化。
