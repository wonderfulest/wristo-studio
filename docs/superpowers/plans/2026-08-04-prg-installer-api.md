# PRG Installer API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Studio 和 PrgInstaller 提供有权限、短时、一次性使用的 PRG 启动票据接口。

**Architecture:** 在 `wristo-api` 产品模块内新增独立 prgInstaller 子模块，用 Redis 保存两分钟票据。登录态接口创建票据，公开兑换接口使用 Redis 原子取删，返回同一 PRG 发布记录中的 URL、设备、版本和校验信息。

**Tech Stack:** Java 17、Spring Boot、MyBatis、StringRedisTemplate、JUnit 5、Mockito

---

### Task 1: 定义启动票据 DTO 与返回模型

**Files:**
- Create: `wristo-api/src/main/java/com/wukong/face/modules/products/dto/prg-installer/PrgInstallerTicketCreateDTO.java`
- Create: `wristo-api/src/main/java/com/wukong/face/modules/products/vo/prg-installer/PrgInstallerTicketVO.java`
- Create: `wristo-api/src/main/java/com/wukong/face/modules/products/vo/prg-installer/PrgInstallerRunVO.java`

- [ ] 创建只包含必填 `releaseId` 的请求 DTO，并使用 `@NotNull`。
- [ ] 创建票据响应 `{ ticket, expiresAt }`。
- [ ] 创建运行响应 `{ releaseId, appName, deviceId, releaseVersion, prgUrl, md5, sha256, expiresAt }`；第一版 `sha256` 允许为空，兼容现有 MD5。
- [ ] 运行 `mvn -DskipTests compile`，预期编译通过。
- [ ] 提交 `feat: add prgInstaller ticket models`。

### Task 2: 实现票据存储与原子兑换

**Files:**
- Create: `wristo-api/src/main/java/com/wukong/face/modules/products/service/PrgInstallerTicketService.java`
- Create: `wristo-api/src/main/java/com/wukong/face/modules/products/service/impl/PrgInstallerTicketServiceImpl.java`
- Test: `wristo-api/src/test/java/com/wukong/face/modules/products/service/impl/PrgInstallerTicketServiceImplTest.java`

- [ ] 先写失败测试，覆盖 32 字节随机票据、120 秒 TTL、兑换成功、二次兑换失败和过期失败。
- [ ] 运行 `mvn -Dtest=PrgInstallerTicketServiceImplTest test`，预期因服务不存在失败。
- [ ] 使用 `SecureRandom` 生成 Base64 URL-safe 无填充票据；Redis key 使用 `product:prg-installer:ticket:<ticket>`。
- [ ] Redis value 使用 Jackson 序列化内部 payload，包含 `releaseId`、`userId`、`expiresAt`。
- [ ] 使用 Redis `GETDEL` 对等的 Lua 脚本原子获取并删除，禁止 `get` 后 `delete` 的竞态实现。
- [ ] 对不存在、过期和反序列化失败统一抛出业务异常 `PrgInstaller ticket is invalid or expired`。
- [ ] 重跑目标测试，预期全部通过。
- [ ] 提交 `feat: add one-time prgInstaller tickets`。

### Task 3: 校验发布记录所有权并组装运行信息

**Files:**
- Create: `wristo-api/src/main/java/com/wukong/face/modules/products/service/PrgInstallerRunService.java`
- Create: `wristo-api/src/main/java/com/wukong/face/modules/products/service/impl/PrgInstallerRunServiceImpl.java`
- Test: `wristo-api/src/test/java/com/wukong/face/modules/products/service/impl/PrgInstallerRunServiceImplTest.java`

- [ ] 先写失败测试：发布记录不存在、产品不存在、非所有者、管理员允许、正常创建与兑换、字段来自同一发布记录。
- [ ] 运行目标测试并确认失败。
- [ ] 创建票据时使用 `ProductReleasePrgService.getById(releaseId)` 与 `ProductService.getById(productId)`；允许产品所有者或 `ROLE_ADMIN`。
- [ ] 兑换时只信任票据内 `releaseId`，重新读取发布记录与产品；返回 `prgUrl`、`deviceId`、版本、MD5及产品名称。
- [ ] 不在任何日志输出 ticket或完整签名 URL。
- [ ] 重跑目标测试并确认通过。
- [ ] 提交 `feat: authorize prgInstaller runs`。

### Task 4: 暴露创建与兑换端点

**Files:**
- Create: `wristo-api/src/main/java/com/wukong/face/modules/products/controller/dsn/ProductPrgInstallerDsnController.java`
- Create: `wristo-api/src/main/java/com/wukong/face/modules/products/controller/pub/ProductPrgInstallerPublicController.java`
- Test: `wristo-api/src/test/java/com/wukong/face/modules/products/controller/ProductPrgInstallerControllerTest.java`

- [ ] 使用 MockMvc 写失败测试：`POST /api/dsn/products/prg-installer/tickets` 需要登录并返回 ticket；`POST /api/public/products/prg-installer/tickets/{ticket}/exchange` 无需登录且仅成功一次。
- [ ] 运行目标测试并确认端点不存在。
- [ ] Dsn controller 从 `RequestContextHolder` 读取 `LoginUser`，拒绝空用户，并调用创建服务。
- [ ] Public controller 仅接收 path ticket，不接受 URL、路径或 deviceId参数。
- [ ] 配置现有安全规则，确保创建端点受保护、兑换端点公开；如果 `/api/public/**` 已统一公开则不新增重复规则。
- [ ] 运行控制器测试及 `mvn test`。
- [ ] 提交 `feat: expose prgInstaller ticket endpoints`。

### Task 5: 增加 SHA-256 发布字段

**Files:**
- Create: `wristo-api/src/main/resources/db/migration/V52__add_prg_package_sha256.sql`
- Modify: `wristo-api/src/main/java/com/wukong/face/modules/products/entity/ProductReleasePrg.java`
- Modify: `wristo-api/src/main/java/com/wukong/face/modules/products/dto/ProductReleasePrgCreateDTO.java`
- Modify: `wristo-api/src/main/java/com/wukong/face/modules/products/vo/ProductReleasePrgVO.java`
- Modify: `wristo-api/src/main/resources/mapper/ProductReleasePrgMapper.xml`
- Test: `wristo-api/src/test/java/com/wukong/face/modules/products/service/impl/PrgInstallerRunServiceImplTest.java`

- [ ] 创建 V52迁移，为 PRG发布表增加 nullable `package_sha256 varchar(64)`，不修改 V1至 V51历史迁移。
- [ ] 先扩展映射测试，确认 `sha256` 能进入 PrgInstaller响应，旧记录为空时仍返回 MD5。
- [ ] 修改 entity、DTO、VO和 MyBatis resultMap/insert/update映射。
- [ ] 运行目标测试及 `mvn test`。
- [ ] 提交 `feat: store PRG sha256 checksum`。
