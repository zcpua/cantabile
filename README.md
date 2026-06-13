# Cantabile 如歌

Cantabile 如歌是一个面向古典音乐爱好者、初学者和演出观众的内容型网站。用户可以浏览作曲家、了解代表作品、查看近期演出，并通过搜索和筛选发现感兴趣的音乐内容。

当前版本是可部署的 Next.js MVP，使用静态 TypeScript 数据完成完整浏览体验。

## 功能

- 首页全站搜索入口
- 作曲家列表与详情页
- 作品列表与详情页
- 近期演出列表
- 专题文章列表与详情页
- 前端搜索与筛选
- SEO metadata、`sitemap.xml`、`robots.txt`
- 支持 Vercel 和 Cloudflare Workers 部署

## 技术栈

- Next.js App Router
- TypeScript
- Tailwind CSS v4
- 静态 TypeScript 数据
- Vercel / Cloudflare Workers

## 本地开发

安装依赖：

```bash
npm install
```

启动开发服务：

```bash
npm run dev
```

打开：

```txt
http://localhost:3000
```

## 常用命令

```bash
npm run lint
npm run build
npm run start
```

## Vercel 部署

Vercel 使用默认 Next.js 构建即可：

```txt
Build command: npm run build
Output directory: .next
```

第一版不需要环境变量。

## Cloudflare Workers 部署

本项目通过 Next.js 静态导出生成 `out/`，再由 Wrangler 作为 Workers 静态资源部署。

Cloudflare 构建配置：

```txt
构建命令: npm run build:cloudflare
部署命令: npx wrangler deploy
版本命令: npx wrangler versions upload
根目录: /
```

本地构建 Cloudflare 静态导出：

```bash
npm run build:cloudflare
```

手动部署到 Cloudflare Workers：

```bash
npx wrangler deploy
```

本地验证 Workers 部署配置：

```bash
npx wrangler deploy --dry-run
```

`wrangler.toml` 中的关键配置：

```toml
[assets]
directory = "./out"
not_found_handling = "404-page"
```

## 内容数据

静态内容位于：

```txt
src/data/composers.ts
src/data/works.ts
src/data/performances.ts
src/data/articles.ts
```

关联与查询工具位于：

```txt
src/lib/data.ts
src/lib/search.ts
src/lib/filters.ts
```

## 古典作品库（Wikidata + IMSLP）

`classical_works` 表是站点的"作品权威库"，由两个上游构建：Wikidata
作为主数据（作曲家、作品、作品编号、调性、体裁、创作时间、QID），IMSLP
作为补充（乐谱页 URL、目录编号、IMSLP page id）。流水线分三步：

```bash
# 1) 拉取 20 位精选作曲家及其作品（SPARQL，写入 wikidata_composers / wikidata_works）
npm run sync:wikidata:dry-run     # 看一下
npm run sync:wikidata             # 写库

# 2) 全量镜像 IMSLP 的 people / works 列表（写入 imslp_people_raw / imslp_works_raw）
npm run sync:imslp:dry-run        # 跑一页确认连通
npm run sync:imslp                # 完整同步，约 70 万条 works

# 3) 按 catalog / 标题 / 调性 / 体裁 多级匹配，物化到 classical_works
npm run match:classical-works:dry-run
npm run match:classical-works
```

匹配规则按以下优先级 fall through：`exact-link` → `exact-catalog` →
`normalized-title-key` → `normalized-title-genre`，命中等级写入
`classical_works.match_confidence`。未命中的条目可以通过 `--report-misses`
列出，再人工补 `match_confidence = 'manual'`。

精选作曲家的 QID 列表在 `scripts/lib/composer-seed.mjs`，新增作曲家时同步该文件。

## 路由

```txt
/
/composers
/composers/[slug]
/works
/works/[slug]
/performances
/articles
/articles/[slug]
/about
/sitemap.xml
/robots.txt
```
