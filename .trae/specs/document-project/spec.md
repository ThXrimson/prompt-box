# Prompt Box 项目文档

## 项目概述

Prompt Box 是一个基于 Electron + Vue 3 + TypeScript 开发的桌面应用程序，用于管理和组织 AI 绘画提示词（Prompt）。它帮助用户收集、分类、编辑和组合提示词，支持工作区管理和示例图片管理。

## 技术栈

- **框架**: Electron 35 + Vue 3.5 + TypeScript 5.8
- **构建工具**: electron-vite 3.1 + Vite 6.2
- **UI 组件库**: Element Plus 2.11
- **状态管理**: Pinia 3.0
- **样式**: Tailwind CSS 4.1
- **数据库**: LowDB 7.0 (JSON 文件存储)
- **路由**: Vue Router 4.5
- **其他工具**:
    - pinyin-pro: 拼音搜索支持
    - vue-draggable-plus: 拖拽排序
    - electron-log: 日志记录
    - dayjs: 日期处理
    - decimal.js: 精确数值计算

## 项目架构

### 目录结构

```
prompt-box/
├── src/
│   ├── main/              # Electron 主进程
│   │   ├── handlers/      # IPC 处理器
│   │   ├── services/      # 数据服务层
│   │   │   └── interfaces/# 服务接口定义
│   │   ├── index.ts       # 主进程入口
│   │   └── utils.ts       # 工具函数
│   ├── preload/           # 预加载脚本 (IPC 桥接)
│   ├── renderer/          # 渲染进程 (Vue 应用)
│   │   ├── src/
│   │   │   ├── components/# Vue 组件
│   │   │   ├── views/     # 页面视图
│   │   │   ├── stores/    # Pinia 状态管理
│   │   │   ├── routers/   # 路由配置
│   │   │   ├── hooks/     # 组合式函数
│   │   │   ├── utils/     # 工具函数
│   │   │   ├── icons/     # 图标组件
│   │   │   └── assets/    # 样式文件
│   │   ├── index.html     # 入口 HTML
│   │   ├── auto-imports.d.ts
│   │   └── components.d.ts
│   ├── shared/            # 共享代码
│   │   ├── models/        # 数据模型定义
│   │   └── ipc-channel.ts # IPC 通道枚举
│   └── types/             # 类型定义
├── resources/             # 应用资源
├── build/                 # 构建配置
└── package.json
```

### 核心模块

#### 1. 主进程 (Main Process)

**入口**: `src/main/index.ts`

- 创建 BrowserWindow
- 初始化日志配置 (electron-log)
- 注册自定义协议 `image://` 用于本地图片访问
- 初始化 IPC 处理器

**IPC 处理器** (`src/main/handlers/`):

- `prompt.ts`: 提示词 CRUD 操作
- `tag.ts`: 标签 CRUD 操作
- `workspace.ts`: 工作区 CRUD 操作
- `example.ts`: 示例 CRUD 操作
- `image.ts`: 图片管理
- `other.ts`: 其他功能 (剪贴板、翻译等)

**数据服务** (`src/main/services/`):

- 使用 LowDB 进行 JSON 文件存储
- 每个实体类型有独立的 JSON 文件
- 单例模式管理数据库连接

#### 2. 渲染进程 (Renderer Process)

**入口**: `src/renderer/src/main.ts`

- Vue 3 应用初始化
- Pinia 状态管理
- Vue Router 路由

**路由结构** (`src/renderer/src/routers/menu-router.ts`):

- `/prompt-collection`: 提示词库 (默认页)
- `/workspaces`: 工作区列表
- `/workspace/:workspaceId`: 单个工作区编辑
- `/examples`: 示例列表

**状态管理** (`src/renderer/src/stores/data.ts`):

- 统一管理所有实体数据 (Prompt, Tag, Workspace, Example, Image)
- 提供 CRUD 操作的封装
- 监听主进程数据变更通知
- 定时自动保存 (每2分钟)

#### 3. 共享模块 (Shared)

**数据模型** (`src/shared/models/`):

- `prompt.ts`: 提示词模型
- `tag.ts`: 标签模型
- `workspace.ts`: 工作区模型
- `example.ts`: 示例模型
- `image.ts`: 图片模型
- `prompt-tag.ts`: 工作区中使用的提示词标签模型 (支持权重、括号、分组等)

**IPC 通道** (`src/shared/ipc-channel.ts`):

- 定义所有 IPC 通信通道枚举
- 包括 Get/Create/Update/Delete/Notify 五类操作

## 核心功能

### 1. 提示词管理 (Prompt Collection)

**功能**:

- 添加、编辑、删除提示词
- 为提示词添加翻译、描述、来源
- 提示词分类标签
- 关联示例图片
- 支持普通提示词、特殊提示词、Lora 提示词
- 拼音搜索支持
- 按名称/时间排序

**界面**: `PromptCollection.vue` + `PromptDetail.vue` + `PromptCard.vue`

### 2. 标签管理 (Tag Management)

**功能**:

- 创建、编辑、删除标签
- 未分类标签支持
- 删除标签时自动从提示词和工作区中移除关联

**界面**: `TagEditor.vue` + `TagList.vue` + `TagCollection.vue`

### 3. 工作区 (Workspace)

**功能**:

- 创建、复制、删除工作区
- 正负面提示词编辑
- 支持拖拽排序
- 提示词权重调整 (支持小数精度)
- 括号层级管理 (圆括号/方括号)
- 分组功能
- 禁用/启用提示词
- 一键复制到剪贴板
- 关联标签集合

**界面**: `WorkspaceList.vue` + `Workspace.vue` + `WorkspaceEditor.vue` + `DraggableTags.vue`

### 4. 示例管理 (Examples)

**功能**:

- 创建、编辑、删除示例
- 关联图片 (支持多图)
- 记录正负面参数和额外信息
- 分页浏览
- 画廊预览
- 批量删除空示例

**界面**: `ExampleList.vue` + `ExampleView.vue` + `Gallery.vue` + `ImageCover.vue`

## 数据模型详解

### Prompt (提示词)

```typescript
interface Prompt {
    id: string
    text: string // 提示词文本
    translation: string // 翻译
    description: string // 描述
    source: string // 来源
    kind: PromptKind // 类型: Normal/Special/Lora
    relatedTexts: string[] // 相关文本
    tagIds: string[] // 关联标签ID
    exampleIds: string[] // 关联示例ID
    rate: number // 评分
    createTime: number
    updateTime: number
}
```

### Tag (标签)

```typescript
interface Tag {
    id: string
    text: string
    createTime: number
    updateTime: number
}
```

### Workspace (工作区)

```typescript
interface Workspace {
    id: string
    name: string
    positive: PromptTag[] // 正面提示词列表
    negative: PromptTag[] // 负面提示词列表
    tagIds: string[] // 关联的标签集合ID
    createTime: number
    updateTime: number
}
```

### PromptTag (工作区中的提示词)

支持多种类型:

- `Mono`: 普通提示词 (支持权重、括号)
- `Group`: 分组提示词
- `Lora`: Lora 模型提示词
- `Special`: 特殊关键词 (如 BREAK, AND)
- `Eol`: 换行符

### Example (示例)

```typescript
interface Example {
    id: string
    positive: string // 正面参数
    negative: string // 负面参数
    extra: string // 额外信息
    imageIds: string[] // 关联图片ID
    createTime: number
    updateTime: number
}
```

### Image (图片)

```typescript
interface Image {
    id: string
    fileName: string // 文件名
    createTime: number
    updateTime: number
}
```

## 技术亮点

### 1. PromptTag 系统

工作区中的提示词使用复杂的 `PromptTag` 模型，支持:

- 权重计算 (使用 decimal.js 避免浮点误差)
- 多层括号嵌套
- 分组管理
- Lora 语法解析 `<lora:name:weight>`
- 字符串与对象的双向转换

### 2. 拼音搜索

使用 pinyin-pro 实现中文拼音搜索，支持:

- 全拼匹配
- 首字母匹配
- 中英文混合搜索

### 3. 图片管理

- 自定义 `image://` 协议安全访问本地图片
- 路径规范化防止目录遍历攻击
- 懒加载优化性能

### 4. 数据持久化

- LowDB 单文件 JSON 存储
- 主进程负责实际 IO 操作
- 渲染进程通过 IPC 通信
- 定时自动保存机制

### 5. 类型安全

- 完整的 TypeScript 类型定义
- 共享类型在 main/renderer 间复用
- IPC 通信类型安全

## 开发命令

```bash
# 安装依赖
yarn install

# 开发模式
yarn dev

# 构建
yarn build

# 打包 (Windows)
yarn build:win

# 代码检查
yarn lint
yarn typecheck

# 格式化
yarn format
```

## 配置文件

- `electron.vite.config.ts`: Vite + Electron 构建配置
- `electron-builder.yml`: 应用打包配置
- `tsconfig.json`: TypeScript 配置 (分 node/web 两份)
- `eslint.config.mjs`: ESLint 配置
- `.prettierrc.yaml`: Prettier 配置

## 扩展建议

### 可能的迭代方向

1. **数据导入导出**: 支持从 CSV/JSON 批量导入提示词，导出工作区配置
2. **云端同步**: 添加云存储同步功能
3. **提示词推荐**: 基于使用频率和关联关系推荐提示词
4. **模板市场**: 预设提示词模板分享
5. **多语言支持**: 完整的 i18n 国际化
6. **快捷键系统**: 添加快捷键支持提高工作效率
7. **历史记录**: 工作区编辑历史回溯
8. **批量操作**: 提示词批量编辑、标签批量修改
9. **搜索增强**: 高级搜索、正则匹配、语义搜索
10. **插件系统**: 支持第三方插件扩展

### 技术债务

1. 定时保存机制可以优化为变更即保存
2. 部分组件可以进一步拆分和复用
3. 错误处理可以更加统一
4. 单元测试覆盖不足
