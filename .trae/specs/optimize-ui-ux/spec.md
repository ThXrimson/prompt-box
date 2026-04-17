# UI/UX 全面优化 Spec

## Why
当前 Prompt Box 的用户界面存在视觉风格不统一、交互反馈不足、布局不够精致等问题，影响了用户的使用体验和效率。需要通过系统性的 UI/UX 优化，提升界面的视觉吸引力、交互流畅度和整体一致性，使其符合现代桌面应用的设计标准。

## What Changes
- 建立统一的设计令牌（Design Token）系统，包括色彩、间距、圆角、阴影等
- 优化侧边导航栏的视觉设计和交互体验
- 改进提示词库页面的布局和视觉层次
- 优化工作区页面的布局和信息架构
- 改进示例列表页面的视觉呈现
- 统一所有组件的色彩方案和视觉风格
- 优化滚动条、空状态、加载状态等交互细节
- 改进 PromptCard、TagList 等核心组件的视觉设计
- 优化 Navigator 组件的视觉层次
- 改进 WorkspaceEditor 工具栏的布局和分组

## Impact
- Affected specs: 无
- Affected code:
  - `src/renderer/src/assets/base.css` - 设计令牌和全局样式
  - `src/renderer/src/assets/main.css` - 全局布局样式
  - `src/renderer/src/assets/scrollbar.css` - 滚动条样式
  - `src/renderer/src/App.vue` - 侧边导航
  - `src/renderer/src/components/Navigator.vue` - 导航栏组件
  - `src/renderer/src/views/PromptCollection.vue` - 提示词库页面
  - `src/renderer/src/views/WorkspaceList.vue` - 工作区列表页面
  - `src/renderer/src/views/Workspace.vue` - 工作区页面
  - `src/renderer/src/views/ExampleList.vue` - 示例列表页面
  - `src/renderer/src/components/PromptCard.vue` - 提示词卡片
  - `src/renderer/src/components/PromptDetail.vue` - 提示词详情
  - `src/renderer/src/components/TagList.vue` - 标签列表
  - `src/renderer/src/components/TagCollection.vue` - 标签集合
  - `src/renderer/src/components/TagEditor.vue` - 标签编辑器
  - `src/renderer/src/components/WorkspaceEditor.vue` - 工作区编辑器
  - `src/renderer/src/components/DraggableTags.vue` - 可拖拽标签
  - `src/renderer/src/components/ExampleView.vue` - 示例视图
  - `src/renderer/src/components/Gallery.vue` - 画廊组件
  - `src/renderer/src/components/ImageCover.vue` - 图片封面

## ADDED Requirements

### Requirement: 设计令牌系统
系统 SHALL 在 `base.css` 中建立统一的设计令牌（CSS 自定义属性），覆盖色彩、间距、圆角、阴影等视觉基础变量，所有组件 SHALL 引用这些变量而非硬编码颜色值。

#### Scenario: 色彩令牌定义
- **WHEN** 开发者查看 `base.css`
- **THEN** 能找到完整的色彩令牌定义，包括主色（primary）、语义色（success/warning/danger/info）、中性色梯度（gray-50 到 gray-900）、背景色、边框色、文字色等

#### Scenario: 间距和圆角令牌
- **WHEN** 开发者查看 `base.css`
- **THEN** 能找到统一的间距令牌（如 --spacing-xs/sm/md/lg/xl）和圆角令牌（如 --radius-sm/md/lg/full）

### Requirement: 侧边导航栏优化
系统 SHALL 优化侧边导航栏的视觉设计，使其具有更好的视觉层次和交互反馈。

#### Scenario: 导航栏视觉优化
- **WHEN** 用户查看侧边导航栏
- **THEN** 导航栏具有统一的背景色、合适的内边距、清晰的图标和文字标签、当前选中项有明显的高亮指示

#### Scenario: 导航栏交互反馈
- **WHEN** 用户悬停在导航项上
- **THEN** 导航项有平滑的悬停效果（如背景色变化或微动画）

### Requirement: 提示词库页面优化
系统 SHALL 优化提示词库页面的布局和视觉层次，提升浏览和操作效率。

#### Scenario: 列表面板优化
- **WHEN** 用户查看提示词列表
- **THEN** 列表面板有清晰的视觉边界、合适的内边距、列表项之间有适当的间距和分隔、选中项有明显的高亮效果

#### Scenario: 详情面板优化
- **WHEN** 用户查看提示词详情
- **THEN** 详情面板有清晰的区域划分、表单元素有一致的样式、操作按钮有合理的布局

### Requirement: 工作区页面优化
系统 SHALL 优化工作区页面的布局和信息架构，使操作更加直观高效。

#### Scenario: 工作区列表优化
- **WHEN** 用户查看工作区列表
- **THEN** 工作区卡片有统一的视觉风格、清晰的标题和操作按钮布局、悬停和选中效果

#### Scenario: 工作区编辑器优化
- **WHEN** 用户使用工作区编辑器
- **THEN** 工具栏按钮有合理的分组和视觉分隔、拖拽手柄更加明显、正/负面切换有清晰的视觉指示

### Requirement: PromptCard 组件优化
系统 SHALL 优化 PromptCard 的视觉设计，使其色彩更加和谐、信息层次更加清晰。

#### Scenario: 卡片色彩优化
- **WHEN** 用户查看 PromptCard
- **THEN** 卡片使用和谐的色彩方案（已选中/未选中状态有明确区分），文字颜色与背景有足够对比度

#### Scenario: 卡片信息层次
- **WHEN** 用户查看 PromptCard 内容
- **THEN** 提示词文本、翻译、操作按钮有清晰的视觉层次，LORA 标识和图片图标有适当的位置和样式

### Requirement: TagList 组件优化
系统 SHALL 优化 TagList 的视觉设计，使其色彩与整体风格协调。

#### Scenario: 标签色彩优化
- **WHEN** 用户查看标签列表
- **THEN** 标签使用与整体色彩方案协调的颜色，选中/未选中状态有明确区分，关闭按钮有合适的交互反馈

### Requirement: Navigator 组件优化
系统 SHALL 优化 Navigator 组件的视觉层次，使其更好地与内容区域区分。

#### Scenario: 导航栏视觉层次
- **WHEN** 用户查看页面顶部的导航栏
- **THEN** 导航栏有适当的背景色和底部边框/阴影，与内容区域有清晰的视觉分隔

### Requirement: 滚动条样式优化
系统 SHALL 统一优化滚动条样式，使其在所有区域保持一致且美观。

#### Scenario: 滚动条一致性
- **WHEN** 用户在任意可滚动区域使用滚动条
- **THEN** 滚动条具有统一的外观（宽度、颜色、圆角），悬停时有交互反馈，与整体风格协调

### Requirement: 空状态设计
系统 SHALL 为列表和集合类组件添加空状态提示，当没有数据时显示友好的引导信息。

#### Scenario: 空列表提示
- **WHEN** 用户查看一个没有任何数据的列表（如提示词列表、工作区列表、示例列表）
- **THEN** 显示一个友好的空状态提示，包含图标和引导文字

### Requirement: WorkspaceEditor 工具栏优化
系统 SHALL 优化 WorkspaceEditor 工具栏的布局，将相关操作进行视觉分组。

#### Scenario: 工具栏分组
- **WHEN** 用户查看工作区编辑器工具栏
- **THEN** 相关操作按钮有视觉分组（如编辑操作一组、复制操作一组、显示控制一组），组之间有适当的分隔

### Requirement: 全局过渡动画
系统 SHALL 为页面切换和关键交互添加平滑的过渡动画，提升交互的流畅感。

#### Scenario: 页面切换动画
- **WHEN** 用户在不同页面间切换
- **THEN** 页面内容有平滑的过渡效果（如淡入淡出）

#### Scenario: 列表项动画
- **WHEN** 列表项被添加或删除
- **THEN** 列表项有平滑的进入/退出动画

### Requirement: 示例列表页面优化
系统 SHALL 优化示例列表页面的视觉呈现，使图片展示更加美观。

#### Scenario: 示例图片展示
- **WHEN** 用户查看示例列表
- **THEN** 图片有统一的尺寸和圆角、悬停效果更加精致、空封面有更好的视觉设计

### Requirement: 对话框样式统一
系统 SHALL 统一所有对话框（el-dialog）的样式，使其与整体设计风格一致。

#### Scenario: 对话框视觉一致性
- **WHEN** 用户打开任意对话框
- **THEN** 对话框有统一的圆角、阴影、内边距，标题和按钮样式一致

## MODIFIED Requirements
无

## REMOVED Requirements
无
