# 修复 WorkspaceEditor 不可见 & 面包屑垂直居中

## 问题分析

### 问题 1：WorkspaceEditor 仍然不可见

**根因**：WorkspaceEditor 是一个多根组件（fragment），其模板有两个根元素：

1. `<div ref="dragHandleRef" class="mt-1 h-2 ...">` — 拖拽手柄
2. `<div ref="containerRef" ... :style="{ height: containerHeight + 'px' }">` — 编辑器容器

在 Workspace.vue 的 `flex flex-col` 布局中，这两个根元素成为两个独立的 flex 子项。容器元素虽然有 `height: 200px` 的内联样式，但默认 `flex-shrink: 1`，加上 `min-h-0`，当空间不足时容器会被压缩到 0px。

**修复方案**：将 WorkspaceEditor 的两个根元素包裹在一个 `<div class="shrink-0">` 中，使其成为单根组件，且不会被 flex 布局压缩。

### 问题 2：面包屑垂直位置不居中

**根因**：Navigator 组件没有 `flex items-center` 样式，其 slot 内容的包裹 div `<div class="flex gap-2 justify-start">` 也缺少 `items-center`。面包屑、按钮、选择器等元素高度不同，没有垂直居中对齐。

**修复方案**：在 Workspace.vue 的 navigator 内容 div 上添加 `items-center`。

## 实施步骤

### Step 1：修复 WorkspaceEditor 不可见

* 在 WorkspaceEditor.vue 模板最外层添加一个包裹 `<div class="shrink-0">`，将拖拽手柄和编辑器容器包在一起

* 移除编辑器容器的 `min-h-0`（不需要缩小）

### Step 2：修复面包屑垂直居中

* 在 Workspace.vue 的 navigator 内容 div 上添加 `items-center`

