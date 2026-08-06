# 更新日志 (Changelog)

本项目所有值得记录的变更均会收录于此文件。

格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本 (Semantic Versioning)](https://semver.org/lang/zh-CN/)。

## [Unreleased]

暂无待发布变更。

## [v0.1.3] - 2026-08-06

### 修复

- **修复文件下载"物理文件不存在"错误**：公共空间和会议空间上传的文件，下载时一律报错
  "物理文件不存在"。原因为数据库存储路径与实际物理存储位置不一致——存储路径中多了一层
  `PUBLIC` / `CONFERENCE` 子目录，而物理文件实际直接存放于 `uploads/public/`、
  `uploads/conference/` 下。现已将存储路径修正为与实际位置完全一致，内阁空间文件不受影响。

### 其他

- 使用当前 TypeScript 版本重新构建 `dist/` 产物（无运行逻辑变更）。

### 升级说明

直接拉取最新代码或覆盖 `dist/` 后重启服务即可，无需迁移数据库。

## [v0.1.2] - 2026-08-06

### 新增

- 新增"关于"页面：免责声明、GPL v3 完整许可证查看与 GitHub 链接。
- 前端构建产物纳入 git 版本管理，支持单进程直接部署。

### 变更

- 全部源码文件补充 GPL v3 许可证头。

## [v0.1.1] - 2026-08-05

### 新增

- 初始版本发布。
- 四大空间文件管理：内阁空间（内部隔离）、公共空间（官方发布）、会议空间（提交与审核）、磋商空间（群组文件往来）。
- 拉群磋商：代表可创建包含 2 个及以上内阁的群组进行文件磋商，学术组可查看全部群聊并参与指导。
- 管理员系统：账户管理（添加/改密/删除）、内阁管理（开设/删除，级联清理文件）。
- 基于 JWT 的身份鉴权与权限隔离。
- 中文文件名上传/下载支持（RFC 5987 响应头 + UTF-8 解析）。
- SQLite（本地开发）↔ MariaDB（生产）双数据库支持。

[Unreleased]: https://git.ssug.top/xiqiu/MUNFMS/compare/v0.1.3...HEAD
[v0.1.3]: https://git.ssug.top/xiqiu/MUNFMS/compare/v0.1.2...v0.1.3
[v0.1.2]: https://git.ssug.top/xiqiu/MUNFMS/compare/v0.1.1...v0.1.2
[v0.1.1]: https://git.ssug.top/xiqiu/MUNFMS/releases/tag/v0.1.1
