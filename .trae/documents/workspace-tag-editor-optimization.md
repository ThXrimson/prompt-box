# 工作区 Tag 编辑区优化计划

## 需求概述

1. 对 tag 单击即可打开编辑弹窗
2. 工具栏搜索框添加确认输入按钮
3. 工具栏搜索框添加有限条搜索历史记录（重复内容不重复出现，但排序提前）
4. 工具栏搜索框在确认输入后删除输入内容

***

## 实现步骤

### 步骤 1：修改 tag 单击行为 — 打开编辑弹窗

**文件**: [DraggableTags.vue](file:///d:/work_space/code/prompt-box/src/renderer/src/components/DraggableTags.vue)

**当前行为**:

* 单击 → `handleClick` → 延迟 250ms 后调用 `switchCollapse`（折叠/展开组）

* 双击 → `handleDblClick` → `toggleDisable`（切换禁用）

**修改方案**:

* 将 `handleClick` 的逻辑从 `switchCollapse` 改为调用 `editPromptTag`

* 对于 EOL 和 Special 类型的 tag，单击不做响应（保持现有逻辑，它们不可编辑）

* 将"折叠/展开组"功能移到下拉菜单中（仅对 GroupPromptTag 显示）

* 双击行为保持不变（切换禁用）

**具体改动**:

1. 修改 `handleClick` 函数：对可编辑的 tag（非 EOL、非 Special）调用 `editPromptTag`
2. 在下拉菜单中为 GroupPromptTag 添加"折叠/展开"选项
3. 更新操作说明 popover 中的单击说明

### 步骤 2：搜索框添加确认输入按钮

**文件**: [EditorToolbar.vue](file:///d:/work_space/code/prompt-box/src/renderer/src/components/EditorToolbar.vue)

**当前实现**: 搜索框为 `el-input`，仅支持回车键确认输入。

**修改方案**:

* 在 `el-input` 的 `#suffix` 插槽中添加一个确认按钮（使用 Element Plus 的 `CircleCheck` 或 `Search` 图标）

* 点击确认按钮时触发 `createTag` 事件（与回车键行为一致）

* 按钮仅在输入内容非空时显示

**具体改动**:

1. 在 `el-input` 中添加 `#suffix` 插槽
2. 添加条件渲染的确认图标按钮
3. 点击按钮时 emit `createTag` 事件

### 步骤 3：搜索框添加搜索历史记录

**文件**:

* [useEditorSearch.ts](file:///d:/work_space/code/prompt-box/src/renderer/src/hooks/useEditorSearch.ts) — 核心逻辑

* [EditorToolbar.vue](file:///d:/work_space/code/prompt-box/src/renderer/src/components/EditorToolbar.vue) — UI 展示

**设计决策**:

* 历史记录上限：**10 条**

* 持久化方式：**localStorage**（轻量级，无需经过 IPC，适合搜索历史这种非关键用户偏好数据）

* 重复内容处理：已存在的记录移到最前面，不重复添加

* 展示方式：使用 `el-popover` 在输入框聚焦且存在历史记录时显示历史列表

**useEditorSearch.ts 改动**:

1. 新增 `searchHistory` ref（`string[]`）
2. 新增 `confirmSearch(text: string)` 函数：

   * 将文本添加到历史记录（去重 + 移到最前 + 限制条数）

   * 调用 `createPromptTag(text)` 创建标签

   * 清空 `searchText`

   * 持久化到 localStorage
3. 从 localStorage 初始化 `searchHistory`
4. 导出 `searchHistory` 和 `confirmSearch`

**EditorToolbar.vue 改动**:

1. 新增 props: `searchHistory: string[]`
2. 新增 emit: `confirmSearch`
3. 将 `el-input` 包裹在 `el-popover` 中
4. Popover 内容为历史记录列表，点击历史项时 emit `confirmSearch`
5. Popover 在输入框聚焦且有历史记录时显示
6. 回车键和确认按钮都触发 `confirmSearch` 而非 `createTag`

**WorkspaceEditor.vue 改动**:

1. 从 `useEditorSearch` 获取 `searchHistory` 和 `confirmSearch`
2. 将 `searchHistory` 传递给 `EditorToolbar`
3. 将 `@create-tag` 事件改为 `@confirm-search`，调用 `confirmSearch`

### 步骤 4：确认输入后清空搜索框内容

**文件**:

* [useEditorSearch.ts](file:///d:/work_space/code/prompt-box/src/renderer/src/hooks/useEditorSearch.ts) — 在 `confirmSearch` 中清空 `searchText`

* [EditorToolbar.vue](file:///d:/work_space/code/prompt-box/src/renderer/src/components/EditorToolbar.vue) — 确保清空后 UI 同步

**说明**: 此步骤已在步骤 3 的 `confirmSearch` 函数中实现（清空 `searchText`），无需额外改动。只需确保 `EditorToolbar` 中回车和确认按钮都调用 `confirmSearch` 而非直接 `createTag`。

***

## 涉及文件总览

| 文件                    | 改动内容                                          |
| --------------------- | --------------------------------------------- |
| `DraggableTags.vue`   | 修改单击行为、下拉菜单添加折叠/展开选项、更新操作说明                   |
| `EditorToolbar.vue`   | 添加确认按钮、添加搜索历史 popover、修改事件触发逻辑                |
| `useEditorSearch.ts`  | 添加搜索历史管理、添加 confirmSearch 函数、localStorage 持久化 |
| `WorkspaceEditor.vue` | 传递 searchHistory、绑定 confirmSearch 事件          |

***

## 注意事项

1. **单击编辑 vs 折叠/展开**: 将折叠/展开组的功能移至下拉菜单，确保组标签仍可通过菜单操作
2. **搜索历史 localStorage key**: 使用 `prompt-box:search-history` 作为 key，避免与其他应用冲突
3. **Popover 交互**: 搜索历史 Popover 在用户选择历史项或点击外部时关闭
4. **空输入处理**: 确认按钮和回车键在输入为空时不触发任何操作

