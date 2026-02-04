# Apartment Manager（公寓管理系统）

前后端分离：React（`apps/web`）+ Express（`apps/api`），单仓库 monorepo（pnpm workspaces + Turborepo）。

## 技术栈

- **前端**：React + TypeScript + Vite、Ant Design、React Router、TanStack Query、Zustand、ECharts
- **后端**：Express + TypeScript、Prisma + PostgreSQL、Zod、JWT(access/refresh)、BullMQ + Redis、Swagger(OpenAPI)

## 本地开发（推荐）

### 1) 启动基础设施（PostgreSQL + Redis）

```bash
docker compose up -d
```

> 默认会暴露：Postgres `5432`、Redis `6379`

### 2) 安装依赖

```bash
pnpm install
```

### 3) 初始化数据库（生成 Client / 迁移 / Seed）

```bash
pnpm -C apps/api prisma:generate
pnpm -C apps/api prisma:migrate
pnpm -C apps/api db:seed
```

### 4) 启动开发服务器

- **方式 A（推荐）**：同时启动前端+后端

```bash
pnpm dev
```

- **方式 B**：分别启动

```bash
# API
pnpm -C apps/api dev

# Web
pnpm -C apps/web dev
```

### 5) 启动出账 Worker（用于自动出账/通知）

```bash
pnpm -C apps/api dev:worker
```

## 访问地址

- **Web**：`http://localhost:5173`
- **API**：`http://localhost:3000`
- **Swagger UI**：`http://localhost:3000/docs`
- **OpenAPI JSON**：`http://localhost:3000/openapi.json`

## 默认管理员（Seed）

Seed 默认会创建：

- **手机号**：`13800000000`
- **密码**：`admin123456`
- **组织**：`示例组织`

可通过 `apps/api/.env` 覆盖：

- `SEED_ADMIN_PHONE`
- `SEED_ADMIN_PASSWORD`
- `SEED_ORG_NAME`

## 后端集成测试

确保 Postgres/Redis 已启动（`docker compose up -d`），然后运行：

```bash
pnpm -C apps/api test
```

测试会自动使用 `DATABASE_URL` 的 `schema=test` 进行迁移与数据清理。

## Docker 一键部署（Web + API + Worker + Postgres + Redis）

```bash
docker compose -f docker-compose.app.yml up -d --build
```

- **Web**：`http://localhost:8080`
- **API**：`http://localhost:3000`
- **Swagger UI**：`http://localhost:3000/docs`

停止并清理数据卷：

```bash
docker compose -f docker-compose.app.yml down -v
```

> 注意：`docker-compose.app.yml` 内的 `JWT_ACCESS_SECRET/JWT_REFRESH_SECRET` 仅用于快速启动演示，实际部署请务必替换为高强度随机值。

```bash
pnpm install
```

2. 启动（会同时启动前端与后端）

```bash
pnpm dev
```

> 数据库、Redis、Docker 部署说明会在后续待办完成后补齐。

