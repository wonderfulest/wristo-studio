# Wristo Studio 在线 Bitmap Font Maker 设计规格

## 1. 背景与目标

Wristo 当前存在两套语义不同的字体能力：

- `DesignFont` 管理 TTF/OTF、字体元数据、审核状态和用于 Connect IQ 构建的多尺寸 BMFont 包。
- `BitmapFont` 管理数字 `0-9` 与符号 `:` 的逐字 SVG 素材。

本功能属于 `DesignFont`，不扩展或复用现有 `BitmapDigitDialog`。Studio 新增独立的在线 Bitmap Font Maker，允许设计师上传本地 TTF/OTF、调整位图化样式、预览并在浏览器生成 Wristo 标准多尺寸 BMFont 包。后端完整校验产物后创建新的 `DesignFont`，不修改源字体或已有字体。

第一版目标：

- 仅支持上传本地 `.ttf`、`.otf`。
- 仅支持 `number_font` 与英文 `text_font`。
- 支持合成字重、斜体和轮廓。
- 一次生成全部 39 个 Wristo 标准尺寸。
- 生成现有构建链可直接消费的 `font-bitmaps/<slug>/<slug>.zip`。
- 每次发布创建独立的 `DesignFont`，状态固定为 `Submitted`。

第一版不支持：

- 从现有 DesignFont 字体库选择源字体。
- 中文字体、图标字体或自定义字符集。
- 多 PNG page。
- 覆盖或更新已有 DesignFont 的位图包。
- 页面刷新后的草稿或构建结果恢复。
- Garmin 上分别设置填充色与轮廓色。

## 2. 已确认的产品决策

1. 在线制作器接入 `DesignFont`，不接入逐字素材 `BitmapFont`。
2. 每次制作发布为新的 `DesignFont`；原字体和已有派生字体保持不变。
3. 发布包必须包含全部标准尺寸，不能让用户选择子集。
4. 第一版只支持 `number_font` 和英文 `text_font`。
5. 第一版只支持本地 TTF/OTF 上传。
6. 采用“前端生成、后端完整校验并入库”的架构。
7. 每个尺寸只允许一个 PNG page，以保持现有资源结构兼容。

## 3. 整体架构

### 3.1 数据流

```text
上传 TTF/OTF
  -> 前端解析字体元数据和字符覆盖
  -> 选择类型并配置样式 recipe
  -> 当前尺寸实时预览
  -> Web Worker 生成全部 39 个尺寸
  -> 前端结构预校验
  -> 生成 ZIP、manifest.json、recipe.json
  -> 发布接口上传源字体和产物
  -> 后端进行安全与契约校验
  -> 上传源字体和 font-bitmaps ZIP
  -> 数据库事务创建 Submitted DesignFont
```

### 3.2 前端模块边界

- `BitmapFontMakerView`：制作页面、表单状态、生成和发布流程。
- `FontSourceLoader`：读取 TTF/OTF、校验格式、提取字体名称、字重、斜体与字符覆盖。
- `BitmapGlyphRenderer`：通过 Canvas 栅格化字形并应用字重、斜体、轮廓 recipe。
- `BitmapAtlasPacker`：将字形装入单页 Atlas，计算图集坐标。
- `BmFontWriter`：输出 AngelCode Text `.fnt`。
- `BitmapFontBatchBuilder`：按标准尺寸批量生成，报告进度并支持取消。
- `BitmapFontPackageWriter`：输出目录、manifest、recipe 和 ZIP。
- `BitmapFontPackageValidator`：上传前执行轻量结构校验。
- Web Worker：承载批量生成和压缩，避免阻塞 Studio 主线程。

每个模块只通过明确的数据类型交互；页面组件不直接操作 Canvas 打包细节或拼接 `.fnt` 文本。

### 3.3 后端模块边界

- `BitmapFontPublishController`：接收 multipart 请求并进行身份、会员与基本参数校验。
- `BitmapFontPackageValidator`：解析和校验源字体、ZIP、Manifest、FNT 与 PNG。
- `BitmapFontPackageStorageService`：上传源字体与位图包，执行失败补偿。
- `BitmapFontPublishService`：协调校验、存储和 `DesignFont` 创建事务。

后端不重新栅格化字体，也不判断视觉效果；它负责安全、完整性、路径、元数据与 Wristo 兼容性。

### 3.4 DesignFont 派生样式扩展

源 TTF/OTF 的内部轮廓不会被改写；粗细、斜体和轮廓只烘焙到 BMFont PNG。因此 `DesignFont` 必须新增可版本化的 `bitmapRecipe` 字段并通过 VO 返回，不能只保存原始 TTF 元数据。

- 字体卡片和 Studio 画布继续加载源 TTF/OTF。
- 当 `bitmapRecipe` 存在时，Studio 预览层将其映射到 Fabric 的 `fontWeight`、`skewX`、`stroke`、`strokeWidth` 和填充策略。
- Connect IQ 导出不再次应用 recipe，而是直接使用已经烘焙样式的 `.fnt + PNG`。
- 普通 DesignFont 的 `bitmapRecipe=null`，保持现有预览和导出行为。

前端预览映射与批量 BMFont 生成器共享同一个 recipe 类型和换算函数，避免两个实现分别解释角度、em 轮廓宽度或 outlineMode。由于 Fabric/Canvas 与 Garmin 位图仍可能存在抗锯齿差异，Simulator 继续作为最终视觉验收依据。

## 4. Studio 页面与交互

### 4.1 入口

在字体导入区域增加独立入口：

```text
Font Library
  - Upload Font
  - Create Bitmap Font
```

`Create Bitmap Font` 打开独立制作页面，而不是现有 `BitmapDigitDialog`。

### 4.2 页面布局

制作器采用单页工作台：

- 左侧：源字体、DesignFont 元数据与样式配置。
- 中间：设备与文字实时预览。
- 右侧：当前尺寸的真实 Atlas、逐字符边界和字符覆盖检查。
- 底部：批量生成、校验和发布状态。

### 4.3 源字体解析

选择 TTF/OTF 后，前端显示：

- Font Family
- Full Name
- PostScript Name
- 原始字重
- 是否斜体
- Glyph Count
- 文件大小
- 必需字符覆盖情况

发布前，字体文件只存在于浏览器内存，不写入 IndexedDB，也不上传服务器。

### 4.4 DesignFont 元数据

用户填写或确认：

- `fullName`：字体库显示名称。
- `slug`：根据名称和样式自动建议，允许在生成前修改。
- `type`：仅 `number_font` 或 `text_font`。
- `language`：第一版固定为 `en`。
- `styleTags`：可选。
- `searchKeywords`：可选。

样式自动参与建议名称和 slug，例如 `Roboto Outline Italic` / `roboto-outline-italic`。后端是 slug 唯一性的最终裁决者；冲突返回错误，不能覆盖已有字体。

当前数据库仅以 `(slug, user_id)` 保证唯一，但 S3 路径 `font-bitmaps/<slug>/<slug>.zip` 不包含用户维度。新发布接口必须按全局 slug 判重，并在迁移前审计已有重复 slug；确认无冲突后增加全局唯一约束，避免不同用户覆盖同一个对象 key。

### 4.5 样式与预览

第一版样式项：

- `fontWeight`：100-900，默认来自源字体。
- `italicAngle`：0 到 -20 度。
- `outlineWidthEm`：以 em 比例保存并按目标尺寸换算像素。
- `outlineMode`：`fill`、`fill-outline`、`outline-only`。

固定策略：

- `lineJoin=round`
- 开启抗锯齿
- padding 根据轮廓和倾斜后的像素边界自动计算

预览可切换标准尺寸、预览文字和 Garmin 设备背景。调整样式时只生成当前预览尺寸。右侧展示真实 Atlas 和字形边界，用于发现裁剪、基线、间距、粘连和缺字问题。

`fill-outline` 是单色遮罩的加粗轮廓形状，不代表 Garmin 运行时可为填充和轮廓设置两种颜色。

### 4.6 生成与发布

页面提供两个独立操作：

- `Generate Package`：生成 39 个尺寸、执行前端预校验并允许下载 ZIP。
- `Publish to Font Library`：上传已通过预校验且未过期的构建结果。

任何影响输出的字体、类型、字符集或样式参数变化，都将现有结果标记为过期并禁用发布。仅修改 `fullName`、slug、标签或搜索关键词不要求重新栅格化，但发布时仍需重新生成 Manifest 哈希。

批量生成显示当前尺寸、总进度和取消操作。取消后保留 recipe 和源字体，但丢弃未完成的包。

发布成功后打开新 DesignFont 详情。刷新或离开页面后，第一版不恢复源字体、recipe 或构建结果。

## 5. 字符集与尺寸契约

### 5.1 标准尺寸

必须包含且仅包含以下 39 个尺寸：

```text
6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 21, 24,
30, 36, 42, 48, 54, 60, 66, 72, 78, 84, 96,
108, 120, 132, 144, 156, 168, 180, 192, 204,
216, 228, 240, 264, 288, 312
```

### 5.2 字符集 Profile

`number_font` 使用 `wristo-number-v1`：

```text
U+0030-U+003A, U+00B0
```

即数字 0-9、冒号和度数符号。

英文 `text_font` 使用 `wristo-text-en-v1`：

```text
U+0020-U+007E, U+00B0, U+2010, U+2013, U+2019, U+2026
```

源字体缺少任何必需字符时禁止生成或发布。禁止使用浏览器 fallback 字体补齐缺字。

## 6. BMFont 生成规范

### 6.1 单尺寸生成

每个字形按以下顺序处理：

1. 使用源字体和目标尺寸建立字体度量。
2. 应用 fontWeight 与 italicAngle。
3. 根据 outlineMode 和 outlineWidthEm 绘制填充或轮廓。
4. 扫描 Alpha 像素得到真实非透明边界。
5. 计算 `width`、`height`、`xoffset`、`yoffset` 与 `xadvance`。
6. 按统一 baseline 计算 `base` 和 `lineHeight`。
7. 将字形装入 Atlas 并输出 PNG。
8. 输出 AngelCode Text `.fnt`。

空格等合法的无像素字形允许 `width/height=0`，但必须保留正确的 `xadvance`。

### 6.2 FNT 约束

- AngelCode Text 格式。
- `unicode=1`。
- PNG 使用 Alpha 遮罩。
- `pages=1`。
- `page id=0 file="<slug>-g_0.png"`。
- glyph codepoint 唯一。
- glyph 坐标不能越出 `scaleW/scaleH`。
- 保留源字体 kerning；没有 kerning 时允许为空。
- `info size` 的符号与数值语义必须和当前 Wristo BMFont 资源一致。

### 6.3 Atlas 约束

- 每个尺寸只允许一个 PNG。
- 自动选择可容纳全部 glyph 的 Atlas 尺寸。
- 最大 `8192 x 8192`。
- 字形矩形不能重叠。
- 如果单页无法容纳标准字符集，该尺寸生成失败，不能静默拆分多页。
- 生成和打包过程应及时释放已完成尺寸的未压缩 Canvas 像素。

## 7. ZIP、Recipe 与 Manifest

### 7.1 ZIP 结构

ZIP 根目录直接包含字体文件、Manifest、Recipe 和尺寸目录，不额外嵌套 `<slug>/`：

```text
<slug>.ttf 或 <slug>.otf
manifest.json
recipe.json
6/
  <slug>-g.fnt
  <slug>-g_0.png
7/
  <slug>-g.fnt
  <slug>-g_0.png
...
312/
  <slug>-g.fnt
  <slug>-g_0.png
```

上传后对象路径保持：

```text
font-bitmaps/<slug>/<slug>.zip
```

该结构与当前上传脚本对字体目录内容使用相对路径压缩的行为一致。实现时增加固定契约测试，确保前端打包器、后端校验器与 `download-font-from-s3.py` 对 ZIP 根目录的理解一致。

### 7.2 recipe.json

Recipe 是可审计、可复现的样式描述，至少包含：

```json
{
  "schemaVersion": 1,
  "rendererVersion": "1",
  "fontWeight": 700,
  "italicAngle": -12,
  "outlineWidthEm": 0.04,
  "outlineMode": "outline-only",
  "lineJoin": "round",
  "antialias": true
}
```

Recipe 中不得保存本地绝对路径或用户环境信息。

### 7.3 manifest.json

Manifest 至少包含：

```json
{
  "schemaVersion": 1,
  "slug": "roboto-outline-italic",
  "type": "text_font",
  "language": "en",
  "source": {
    "fileName": "Roboto-Regular.ttf",
    "sha256": "..."
  },
  "sizes": [6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 21, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 84, 96, 108, 120, 132, 144, 156, 168, 180, 192, 204, 216, 228, 240, 264, 288, 312],
  "charset": {
    "profile": "wristo-text-en-v1",
    "codepoints": []
  },
  "recipeSha256": "...",
  "packageContentSha256": "..."
}
```

`packageContentSha256` 不能直接定义为“包含 manifest 自身的 ZIP SHA-256”，否则形成自引用。算法固定为：排除 `manifest.json`，将剩余文件路径按 UTF-8 字节升序排列；每项编码为 `path + NUL + lowercaseSha256 + LF`，拼接后再计算 SHA-256。服务端使用同一算法复算。上传传输层如需完整 ZIP 哈希，应放在 multipart metadata 或 HTTP header 中，不写入 ZIP 内 Manifest。

## 8. 发布 API

新增接口：

```http
POST /api/dsn/fonts/bitmap-build/publish
Content-Type: multipart/form-data
```

请求 parts：

- `sourceFont`：原始 TTF/OTF。
- `package`：`<slug>.zip`。
- `manifest`：与 ZIP 内内容一致的 `manifest.json`。
- `recipe`：与 ZIP 内内容一致的 `recipe.json`。
- `metadata`：DesignFont 创建字段 JSON。

`metadata` 只允许：

- `fullName`
- `slug`
- `type`
- `language`
- `styleTags`
- `searchKeywords`

后端忽略并拒绝客户端提供的 `userId`、`status`、`isSystem`、`isActive`、审核信息或存储路径。用户归属来自当前认证上下文；状态固定为 `Submitted`。

后端从源字体和 recipe 生成其余 `DesignFont` 字段：

- `family`、`copyright`、`versionName`、`widthClass` 来自源字体。
- `subfamily`、`weight`、`weightClass`、`italic` 来自源字体与 recipe 的合成结果。
- `glyphCount` 使用最终字符集数量。
- `postscriptName` 使用 `<source-postscript>-Wristo-<slug>` 生成并按字段长度安全截断；它是派生字体标识，不伪装为源字体内部 PostScript Name。
- `bitmapRecipe` 保存经过后端校验和规范化的完整 recipe。
- `ttf` 指向上传的原始源字体文件记录。

## 9. 后端校验规则

### 9.1 身份与业务规则

- 必须登录并满足 Studio Premium 发布权限。
- `type` 仅允许 `number_font`、`text_font`。
- `language` 必须为 `en`。
- slug 必须符合规范且在全局范围唯一，因为对象存储路径不含 userId。
- Manifest、metadata 和包内路径中的 slug/type/language 必须一致。

### 9.2 文件与安全规则

- 校验扩展名、MIME、magic bytes 和大小限制。
- TTF/OTF 必须能被服务端字体解析器读取。
- ZIP 必须防御 Zip Slip、绝对路径、符号链接、异常压缩比和异常文件数量。
- 解压和解析采用流式或有界缓冲，不能将整个 ZIP 读入 JVM 堆。
- `.fnt` 不能引用包外路径或未知页面。

第一版安全上限固定为：源字体 20 MB、上传 ZIP 256 MB、解压总量 1 GB、单文件 64 MB、包内文件 128 个、最大压缩比 100:1。所有值应配置化，但生产环境不能使用无限制默认值；超限返回 `BITMAP_FONT_PACKAGE_UNSAFE`。

### 9.3 BMFont 契约规则

- 39 个标准尺寸必须完整且不能包含未知尺寸目录。
- 每个尺寸必须恰好包含一个 `<slug>-g.fnt` 和一个 `<slug>-g_0.png`。
- `.fnt` 必须声明 `pages=1` 和 `page id=0`。
- PNG 尺寸必须匹配 `.fnt` 的 `scaleW/scaleH`。
- glyph 坐标必须位于 Atlas 内且矩形不重叠。
- 必需 codepoint 完整且不重复。
- 字符集必须与 type 的 Profile 完全匹配，不接受静默缺字。
- `scaleW/scaleH` 不得超过 8192。
- 源字体、recipe 和 package content 哈希必须匹配 Manifest。

## 10. 存储、事务与补偿

发布顺序：

```text
接收至受控临时文件
  -> 完整校验
  -> 上传源字体
  -> 上传 font-bitmaps/<slug>/<slug>.zip
  -> 数据库事务创建 DesignFont 和文件关系
  -> 返回 Submitted DesignFont
```

约束：

- 数据库记录不能在资产完整上传前对用户可见。
- 数据库事务失败时，服务端尝试删除本次上传对象。
- 即时清理失败时写入持久化补偿任务，记录对象 key、请求用户和失败原因。
- 并发 slug 冲突必须由数据库唯一约束兜底；失败请求不能覆盖获胜请求的对象。
- 为避免并发请求写入同一个最终 key，上传应先使用请求级临时 key，数据库创建成功后再完成最终对象发布或执行安全的对象提升流程。
- 所有临时文件必须在成功、失败或取消路径中清理。

## 11. 错误模型

后端返回稳定错误 code 和结构化 details，例如：

```json
{
  "code": "BITMAP_FONT_GLYPH_MISSING",
  "message": "Required glyphs are missing",
  "details": {
    "size": 48,
    "codepoints": [58, 176]
  }
}
```

至少区分：

- `BITMAP_FONT_SOURCE_INVALID`
- `BITMAP_FONT_GLYPH_MISSING`
- `BITMAP_FONT_SIZE_MISSING`
- `BITMAP_FONT_FNT_INVALID`
- `BITMAP_FONT_ATLAS_INVALID`
- `BITMAP_FONT_MANIFEST_MISMATCH`
- `BITMAP_FONT_PACKAGE_UNSAFE`
- `BITMAP_FONT_SLUG_CONFLICT`
- `BITMAP_FONT_STORAGE_FAILED`
- `BITMAP_FONT_PUBLISH_FAILED`

前端按阶段展示：源字体解析、字符覆盖、单尺寸生成、本地校验、上传、后端校验、存储和入库。发布失败后保留 recipe 与已生成 ZIP；仅 slug 或 metadata 错误允许不重新生成字形直接重试。

## 12. 性能与资源约束

- 样式交互只重绘当前预览尺寸。
- 39 尺寸批量构建在 Web Worker 内执行。
- 用户可取消构建。
- 峰值内存目标不超过 512 MB。
- 单 Atlas 最大 8192 x 8192。
- ZIP 逐尺寸写入，避免同时保留 39 份未压缩 Canvas。
- 后端流式接收、哈希、解压和校验。
- 在支持的浏览器范围内明确最低能力要求；不支持 Worker/OffscreenCanvas 所需能力时，应给出明确提示，不自动退化为阻塞主线程的完整构建。

## 13. 测试策略

### 13.1 前端单元测试

- TTF/OTF 元数据解析。
- type 到字符集 Profile 的映射。
- 缺失 glyph 检测且不使用 fallback。
- 轮廓与斜体后的像素边界。
- offset、advance、base、lineHeight 计算。
- Atlas 不重叠、不越界。
- AngelCode Text 序列化与特殊字符处理。
- 标准尺寸集合不可漂移。
- 输出参数变化使构建结果过期。
- Manifest 内容哈希与 ZIP 结构。

栅格化测试以结构、边界、非空 Alpha 和度量约束为主；只对少量固定且可分发的测试字体做基准图测试，避免把跨浏览器抗锯齿细微差异当成主要契约。

### 13.2 后端测试

- 正常 number font 与 text font 发布。
- 缺尺寸、未知尺寸、缺 PNG、错误 page 引用。
- glyph 越界、重叠、重复和缺失。
- Manifest、源字体、recipe 与包内容哈希不一致。
- MIME 欺骗、损坏字体、Zip Slip、符号链接和压缩炸弹。
- slug 冲突与并发发布。
- 未登录或无 Premium 权限。
- S3 上传失败不创建数据库记录。
- 数据库失败触发对象清理或补偿任务。
- 新 DesignFont 状态和用户归属由服务端强制设置。

### 13.3 集成与运行时验证

使用许可允许测试分发的固定字体，分别生成：

- 普通数字字体
- 合成粗体
- 合成斜体
- `fill-outline`
- `outline-only`
- 英文文本字体

验证链路：

```text
Studio 预览
  -> 发布
  -> 审核
  -> Studio 字体选择器加载
  -> 项目生成下载 font-bitmaps ZIP
  -> Connect IQ 编译
  -> Simulator 检查代表尺寸
```

至少检查小、中、大代表尺寸，例如 6、48、312；同时抽查其他尺寸的自动契约测试。预览、构建与 Simulator 证明必须分别记录，不能用前端单测或构建成功代替设备渲染验证。

## 14. 完成标准

功能完成必须同时满足：

1. `number_font` 与英文 `text_font` 均能生成全部 39 个尺寸。
2. 产物可被现有 `download-font-from-s3.py` 和项目生成流程直接消费。
3. 不改变 `font-bitmaps/<slug>/<slug>.zip` 路径与现有消费契约。
4. 每次发布创建独立且归属当前用户的 `Submitted DesignFont`。
5. Studio 预览与 Simulator 的基线、间距和轮廓无明显偏差。
6. 后端拒绝不完整、越界、哈希不符或恶意字体包。
7. 现有普通字体上传、字体选择器和逐字 BitmapFont 功能无回归。
8. 生成期间 Studio 主线程保持可交互，取消和失败路径可恢复。
9. 新 DesignFont 在字体卡片和 Studio 画布中应用 `bitmapRecipe`，不能退回未加轮廓或未倾斜的原始 TTF 外观。

## 15. 后续扩展

不属于第一版，但结构需允许后续增加：

- 从已有 DesignFont 选择源字体。
- 中文字符集与分批构建。
- 图标字体和自定义 codepoint 映射。
- 多 Atlas page。
- 服务端异步重建或验证性重渲染。
- Recipe 草稿保存、复制和再次派生。
- 可变字体轴配置。
