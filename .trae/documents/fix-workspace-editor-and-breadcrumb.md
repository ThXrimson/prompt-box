# 修复 Workspace 编辑器不可见 & 面包屑样式优化

## 问题分析

### 问题 1：Workspace 编辑器不可见

**根因**：Workspace.vue 的布局结构中，标签列表区域 `<div class="flex-1 flex overflow-auto mt-1.5 gap-1">` 使用了 `flex-1` 但缺少 `min-h-0`。在 flex 列布局中，flex 子项的默认 `min-height` 为 `auto`（即内容高度），导致该区域不会缩小到内容高度以下，将底部的 WorkspaceEditor 推出可视区域。

此外，WorkspaceEditor 的 `onMounted` 回调中：
```typescript
containerHeight.value = containerRef.value.clientHeight
```
如果此时元素尚未完成布局（clientHeight 为 0），会将 `containerHeight` 设为 0，导致编辑器容器高度为 0px，永久不可见。

**修复方案**：
1. 在 Workspace.vue 的标签列表区域添加 `min-h-0`，允许其缩小到内容高度以下
2. 在 WorkspaceEditor.vue 的 `onMounted` 中使用 `nextTick` 确保布局完成后再读取 clientHeight，并添加保护逻辑：当 clientHeight 为 0 时保留默认值

### 问题 2：面包屑样式不美观

**根因**：Element Plus 的 `el-breadcrumb` 默认样式与应用整体设计风格不协调：
- 默认字体大小偏大
- 分隔符样式与导航栏风格不匹配
- 面包屑项间距不合适
- 缺少与导航栏其他元素的视觉协调

**修复方案**：
1. 自定义面包屑样式，使其与导航栏风格协调
2. 调整字体大小、颜色、间距
3. 使用更紧凑的布局

## 实施步骤

### Step 1：修复 Workspace.vue 布局
- 在标签列表区域的 `flex-1` 后添加 `min-h-0`，确保该区域能正确缩小

### Step 2：修复 WorkspaceEditor.vue 的 onMounted
- 使用 `nextTick` 延迟读取 clientHeight
- 当 clientHeight 为 0 时，不更新 containerHeight（保留默认值 200）

### Step 3：优化 Workspace.vue 面包屑样式
- 添加自定义 CSS 覆盖 el-breadcrumb 默认样式
- 调整字体大小为 13px，与导航栏其他元素一致
- 调整颜色和间距
- 优化分隔符样式
