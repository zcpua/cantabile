# FORENOTE有谱 (forenote-mini)

一款面向古典音乐爱好者的微信小程序：发现演出、收藏关注、把音乐会加入系统日历。基于 Taro 4 + React 18 + TypeScript 构建。

## 功能介绍

### 首页
- 顶部品牌头 + 搜索框，支持按演出名称、城市、场馆、演奏家实时搜索
- 自动轮播 Banner，点击直达详情
- 「为你推荐」演出卡片列表

### 日历（月视图）
- 仿 iPhone 日历的月视图，纵向滑动翻月（前后各 12 个月）
- 有演出的日期以彩色事件条显示标题，超出 3 条折叠为 `+N`
- 点击任意日期进入独立的「日视图」页面，可通过返回手势/箭头退回

### 日视图（独立页面）
- 顶部周条横滑切周，下方按日横滑切天，两者联动
- 当天演出以时间轴 + 配色卡片展示（封面、场馆、演奏者）
- 点击演出卡片进入详情；左上角返回月视图

### 演出详情
- 大图封面、演出介绍
- 演奏者横滑卡片（支持多位，含头像、角色、简介）
- 曲目列表，点击可试听（`InnerAudioContext`）
- 底部操作栏：收藏、加入系统日历（`Taro.addPhoneCalendar`）、跳转购票

### 我的
- 登录 / 退出登录（演示登录，信息存本地）
- 修改个人资料（昵称、签名、头像）
- 我的收藏（跳转收藏列表页）
- 夜间模式设置（跟随系统 / 浅色 / 深色）
- 关于我们、意见反馈、赞赏支持（跳转爱发电链接）

### 收藏列表
- 展示已收藏演出，空态引导

### 夜间模式
- 三档主题偏好：跟随系统、浅色、深色，默认「跟随系统」，本地持久化
- 全站页面、卡片、底部 tabBar、按钮、NutUI 弹层统一换肤
- 「跟随系统」由 CSS `@media (prefers-color-scheme)` + 微信 `darkmode` 原生驱动，实时跟随系统切换
- 手动浅/深通过强制 class 覆盖

## 技术栈

- **Taro** 4.2 — 跨端框架，编译至微信小程序
- **React** 18 + **TypeScript**
- **NutUI React (Taro)** — 通用交互组件（Dialog / ActionSheet / ConfigProvider 主题）
- **Sass** — 样式，主题用 CSS 自定义属性（CSS Variables）实现
- 本地 `Storage` 持久化收藏、用户信息、主题偏好

## 目录结构

```
src/
├── app.config.ts          # 全局路由 + tabBar 配置
├── app.scss               # 全局样式 + 浅色/深色主题变量
├── app.tsx
├── assets/tab/            # tabBar 图标（含深色变体）
├── components/
│   ├── Icon/              # SVG data-URI 矢量图标组件
│   ├── PerformanceCard/   # 演出卡片
│   └── ThemeView/         # ★ 页面统一根容器（注入主题 + NutUI 主色）
├── data/performances.ts   # 演出 mock 数据
├── hooks/
│   ├── useTheme.ts        # 解析当前生效主题 / 偏好 / 强制 class
│   ├── useStatusBar.ts    # 自定义导航栏状态栏高度
│   ├── useTabBarTheme.ts  # tabBar 跟随主题换色/换图标
│   └── useOverlay.tsx     # ★ NutUI Dialog/ActionSheet 命令式封装
├── pages/
│   ├── index/             # 首页
│   ├── calendar/          # 日历月视图
│   ├── day/               # 日视图（独立页）
│   ├── detail/            # 演出详情
│   ├── favorites/         # 收藏列表
│   ├── mine/              # 我的
│   ├── login/             # 登录
│   ├── profile/           # 修改资料
│   └── webview/           # 内嵌网页（赞赏）
├── store/
│   ├── index.ts           # 收藏 + 用户信息
│   └── theme.ts           # 主题偏好 + 订阅
├── styles/
│   └── nutui-theme.scss   # 从 NutUI 抽取的浅/深主题变量（mixin）
├── theme.json             # 微信原生暗黑模式配色（导航栏/窗口背景）
├── types/index.ts
└── utils/
    ├── date.ts            # 日期工具
    └── color.ts           # 演出配色调色板
```

## 开发与构建

```bash
# 安装依赖
npm install

# 开发模式（监听编译）
npm run dev:weapp

# 构建生产包
npm run build:weapp
```

构建产物输出到 `dist/`，用微信开发者工具打开该目录即可预览。

## 开发规范（重要：新功能必须遵守）

为保证暗黑模式与视觉一致性，新增页面 / 组件时务必遵循以下约定，否则极易出现「亮色下正常、暗色下错乱」的问题。

### 1. 页面根容器一律用 `ThemeView`

每个页面的最外层必须是 `<ThemeView>`，不要直接用 `<View className="theme-xxx">`：

```tsx
import ThemeView from '@/components/ThemeView'

export default function SomePage() {
  return (
    <ThemeView className='your-page'>
      {/* 页面内容 */}
    </ThemeView>
  )
}
```

- tab 页（首页/日历/我的）额外传 `tabBar` 让 tabBar 跟随换色：`<ThemeView tabBar>`。
- `ThemeView` 负责三件事：注入主题强制 class、用 NutUI `ConfigProvider` 覆盖主色为古典金、驱动 tabBar。

### 2. 颜色只用 CSS 变量，禁止硬编码

样式里所有颜色走变量（定义见 `app.scss`），不要写死 `#fff` / `#333`：

```scss
.your-page {
  background: var(--bg);        // 页面背景
  color: var(--text);           // 主文字
}
.your-page__card {
  background: var(--surface);   // 卡片/面板
  border: 1px solid var(--divider);
}
```

常用变量：`--bg` `--surface` `--surface-2` `--text` `--text-muted` `--text-light` `--text-faint` `--divider` `--accent`(金) `--primary` `--mask`。按钮用 `--btn-secondary-bg/fg`、`--btn-accent-fg`。新增语义色请同时在 `app.scss` 的 `light-vars` 和 `dark-vars` 两个 mixin 中定义。

### 3. 暗黑模式如何生效（理解原理，避免踩坑）

- **跟随系统**：纯 CSS `@media (prefers-color-scheme: dark)` 自动切换，**不要**用 JS 读 `getAppBaseInfo().theme` 来判断系统主题（冷启动不可靠）。
- **手动浅/深**：`ThemeView` 注入 `.theme-force-light` / `.theme-force-dark` 覆盖媒体查询。
- 主题变量挂在 `.app-page`（ThemeView 的根）上。NutUI 弹层默认行内渲染于其内，能继承变量——所以弹层也会自动适配。

### 4. 弹窗 / 操作面板用 `useOverlay`，不要用 `Taro.showModal/showActionSheet`

微信原生弹窗不受主题控制，暗色下观感差。统一用封装好的 NutUI 弹层：

```tsx
import { useOverlay } from '@/hooks/useOverlay'

const overlay = useOverlay()

overlay.alert({ title: '提示', content: '内容' })
overlay.confirm({ title: '确认', content: '确定吗？' }, () => { /* 确认回调 */ })
overlay.actionSheet({ title: '选择', options: [{ name: '选项A', value: 'a' }] }, (value) => { /* 选中回调 */ })

// 必须在 JSX 末尾渲染弹层节点
return (
  <ThemeView>
    {/* ... */}
    {overlay.node}
  </ThemeView>
)
```

`Taro.showToast`（轻提示）可继续使用，它不涉及主题样式。

### 5. NutUI 主题变量来源

`src/styles/nutui-theme.scss` 是从 `@nutui/nutui-react-taro` 的官方 `default.css` / `dark.css` **抽取**的变量集合（mixin 形式）。**升级 NutUI 版本后需重新生成**，否则新组件的变量可能缺失。生成脚本逻辑：读取 `node_modules/@nutui/nutui-react-taro/dist/styles/themes/{default,dark}.css` 里 `:root,page{}` 块，分别包进 `nutui-light-vars` / `nutui-dark-vars` 两个 mixin。

## 注意事项

- 演出封面与演奏者头像使用 `picsum.photos` 占位图，曲目音频为示例 URL（试听会提示音频不可用，替换为真实 mp3 即可）。
- 真机预览需在微信开发者工具中关闭「域名校验」；正式上线需将相关域名加入合法域名白名单。
- 赞赏走 `web-view` 打开外部链接，需小程序为非个人主体并配置业务域名；个人主体会自动降级为复制链接提示。
- 登录为本地演示，未接入微信真实登录（`Taro.login` + 后端换 openid）。
- tabBar 图标为脚本生成的占位图标，建议上线前替换为正式设计。
