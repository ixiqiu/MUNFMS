# 模联文件管理系统 (MUN File Management System)

常中模联会议的一站式文件流转与磋商管理平台。为模拟联合国会议提供严格隔离的内部文件管理、官方文件发布、大会文件审核提交，以及代表间"拉群"式的双边/多边磋商功能。

> 面向**代表与学术组**的操作说明见 [docs/使用指南.md](docs/使用指南.md)

---

## ✨ 功能特性

- **四大空间**：内阁空间（内部隔离）、公共空间（官方发布）、会议空间（提交与审核）、磋商空间（群组文件往来）
- **拉群磋商**：代表可创建包含 2 个及以上内阁的群组，进行"传纸条"式文件磋商；学术组可查看全部群聊并参与指导
- **管理员系统**：账户管理（添加/改密/删除）、内阁管理（开设/删除，级联清理文件）
- **权限隔离**：所有查询基于 JWT 中的身份严格过滤，杜绝越权访问
- **中文支持**：上传/下载中文文件名不乱码（RFC 5987 响应头 + UTF-8 解析）
- **双数据库**：SQLite（本地开发）↔ MariaDB（生产）无缝切换
- **单进程部署**：前端构建产物由后端托管，一条命令启动完整系统

## 🛠️ 技术栈

| 层 | 技术 |
|---|---|
| 后端 | NestJS 11 · TypeORM · Passport-JWT |
| 前端 | Vue 3 · Vite · TypeScript · Element Plus · Pinia |
| 数据库 | SQLite（默认）· MariaDB |
| 文件存储 | 本地文件系统 + Multer（diskStorage） |

## 👥 角色与权限

| 角色 | 说明 | 主要权限 |
|---|---|---|
| 代表 (DELEGATE) | 归属某个国家/代表团（内阁） | 内阁空间读写、会议空间提交、磋商拉群 |
| 学术组 (ACADEMIC) | 归属主席团/危机团队 | 公共空间管理、会议空间审核与一键复制、查看全部群聊 |
| 管理员 (ADMIN) | 系统管理者（首次启动自动创建） | 账户管理、内阁管理 |

## 🚀 快速开始（本地开发）

### 环境要求

- Node.js **20+**（建议 20 LTS，原生模块兼容性最好）
- npm 10+

### 安装与启动

```bash
# 1. 安装后端依赖
npm install

# 2. 安装前端依赖
cd frontend && npm install && cd ..

# 3. 启动后端（终端 1）
npm run start:dev

# 4. 启动前端（终端 2）
cd frontend && npm run dev
```

访问 **http://localhost:5173**（前端 dev server 已代理 `/api` 到后端 3000 端口）。

### 首次使用

1. 数据库自动创建（`dev.db`，无需配置）
2. 首次启动自动生成管理员：**admin / admin123**（请立即登录修改密码）
3. 先用管理员登录 → 「系统管理」→ 开设内阁（否则注册页没有可选组织）
4. 代表/学术组注册后即可使用

## 🏗️ 构建与部署

### 构建

```bash
npm run build          # 后端 → dist/
cd frontend && npm run build && cd ..   # 前端 → frontend/dist/
```

构建产物（`dist/`、`frontend/dist/`）已纳入 git 版本管理，适合小内存服务器直接拉取运行。

### 生产启动（单进程，页面 + API 同端口）

```bash
npm install --omit=dev && node dist/main.js
```

访问 **http://服务器地址:3000**

### 数据持久化（务必配置）

| 路径 | 说明 |
|---|---|
| `dev.db` | SQLite 数据库（用 MariaDB 时无需此卷） |
| `uploads/` | 上传的文件 |

### 环境变量

| 变量 | 默认值 | 说明 |
|---|---|---|
| `PORT` | `3000` | 服务端口 |
| `JWT_SECRET` | `mun-secret-key` | JWT 签名密钥，生产环境请设置强随机值 |
| `DB_TYPE` | `sqlite` | `sqlite` 或 `mariadb` |
| `SQLITE_DB_PATH` | `dev.db` | SQLite 文件路径 |
| `DB_HOST` | `localhost` | MariaDB 主机（不带端口） |
| `DB_PORT` | `3306` | MariaDB 端口 |
| `DB_USERNAME` | `root` | MariaDB 用户名 |
| `DB_PASSWORD` | 空 | MariaDB 密码 |
| `DB_DATABASE` | `mun_files` | MariaDB 库名（需提前创建，建议 utf8mb4） |

### MariaDB 部署示例（.env）

```ini
DB_TYPE=mariadb
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USERNAME=mun
DB_PASSWORD=你的密码
DB_DATABASE=mun_files
JWT_SECRET=一串随机的长字符串
```

> 使用 MariaDB 前请先创建数据库：`CREATE DATABASE mun_files CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`

## 📁 项目结构

```
├── src/                    # 后端源码
│   ├── auth/               # 登录/注册/JWT
│   ├── files/              # 文件引擎（四大空间）
│   ├── sessions/           # 磋商群组（拉群/消息）
│   ├── cabinets/           # 内阁列表（公开）
│   ├── admin/              # 管理员（账户/内阁管理）
│   ├── common/             # 守卫/装饰器
│   └── entities/           # TypeORM 实体
├── frontend/               # 前端源码 (Vue 3)
│   ├── src/views/          # 页面（登录/注册/四大空间/管理）
│   ├── src/api/            # API 客户端
│   └── src/stores/         # Pinia 状态
├── dist/                   # 后端构建产物（入库）
└── docs/使用指南.md         # 面向代表与学术组的操作文档
```

## 📦 常用命令

| 命令 | 说明 |
|---|---|
| `npm run start:dev` | 后端开发模式（ts-node 热启动） |
| `npm run build` | 构建后端 |
| `npm run build:web` | 构建前端（`cd frontend && npm run build`） |
| `npm start` | 运行后端产物（`node dist/main`） |

## 🔒 安全说明

- 所有文件查询权限在后端基于 JWT 身份强制执行，前端参数不可越权
- 管理员账号为系统引导创建（admin/admin123），部署后请立即修改密码
- `synchronize: true` 会自动同步表结构，适合初期使用；长期生产可考虑关闭并改用迁移

## 📄 许可证

ISC
