# Duo英语 · 多邻国风格英语闯关小程序

模仿多邻国（Duolingo）游戏化学习机制的英语学习小程序，一套代码跨端编译到 **微信小程序** 和 **抖音（字节）小程序**。

## 技术栈

- **Taro 4.x** — 跨端框架（React 语法，编译到微信 / 抖音 / H5 等多端）
- **React 18 + TypeScript**
- **Vite** 编译（`@tarojs/vite-runner`）
- **Sass** 样式

## 核心玩法（对标多邻国）

- 🗺️ **关卡地图**：单元 → 关卡逐级解锁，完成上一关才能进入下一关
- ❤️ **红心机制**：共 5 颗红心，答错扣一颗，红心耗尽本关失败
- ⚡ **XP 经验**：完成一关 +10 XP，全对通关额外 +5 XP，每 100 XP 升一级
- 🔥 **连续打卡**：连续每天学习打卡计数
- 📖 **题型**：英文选择题（看中文选英文 / 看拼写辨析）+ 单词组句翻译题
- 📚 **词库**：完成对应关卡即点亮掌握的单词
- 💾 进度（红心 / XP / 打卡 / 通关记录）本地持久化存储

## 快速开始

```bash
# 安装依赖
npm install

# 微信小程序（微信开发者工具导入项目根目录，或 dist/ 目录）
npm run dev:weapp

# 抖音小程序（抖音开发者工具导入 dist/ 目录）
npm run dev:tt

# 生产构建
npm run build:weapp
npm run build:tt
```

> 微信端请把 `project.config.json` 中的 `appid` 替换为你的小程序 AppID；抖音端同理修改 `project.tt.json`。

## 目录结构

```
├── config/               # Taro 构建配置（Vite 编译器）
├── src/
│   ├── app.tsx           # 应用入口（全局状态 Provider）
│   ├── app.config.ts     # 页面路由 + TabBar 配置
│   ├── data/course.ts    # 课程数据（单元/关卡/题目/词库）
│   ├── store/app-store.tsx  # 全局游戏状态（红心/XP/打卡/进度，本地持久化）
│   └── pages/
│       ├── index/        # 关卡地图（学习）
│       ├── lesson/       # 答题闯关页
│       ├── words/        # 词库
│       └── profile/      # 个人中心（等级/统计/重置）
└── project.tt.json       # 抖音小程序配置
```

## 扩展课程内容

所有课程内容集中在 `src/data/course.ts`，按 `Unit → Lesson → Question` 结构增删题目即可，支持两种题型：

- `choice`：选择题（`options` + `answer`）
- `translate`：组句题（`answer` 单词数组 + `bank` 含干扰词）
