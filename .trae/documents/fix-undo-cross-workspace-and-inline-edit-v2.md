# 修复内联编辑和撤回/重做跨工作区问题

## 问题1：撤回/重做跨工作区 — 点击撤回将工作区内容变成前一个工作区的内容

### 根因分析

**核心问题：`<keep-alive>`** **的 key 不包含** **`workspaceId`，导致切换工作区时复用同一个 DraggableTags 实例，旧工作区的历史记录残留。**

数据流分析：

1. `WorkspaceEditor.vue` 中 `<keep-alive>` 的 key 为 `isPositiveEditor ? 'positive' : 'negative'`，不包含 `workspaceId`
2. 当从工作区 A 切换到工作区 B 时，`currentEditor` computed getter 返回工作区 B 的数据
3. `editor` defineModel 更新为工作区 B 的数据，但 `useManualRefHistory` 的历史栈仍保留工作区 A 的快照
4. 当用户点击撤回时，`undo()` 从历史栈中恢复工作区 A 的数据到 `editor`
5. `editor` 变化触发 `currentEditor` computed setter，调用 `dataStore.workspace.update({ id: props.workspaceId, positive: 工作区A的数据 })`
6. **但此时** **`props.workspaceId`** **已经是工作区 B 的 ID**，所以工作区 B 的数据被工作区 A 的数据覆盖！

之前的修复（watch workspaceId → clear() → debouncedCommit()）存在以下问题：

* `debouncedCommit` 有 500ms 延迟，在延迟期间用户仍可触发 undo

* `clear()` 和 `debouncedCommit()` 之间有 `nextTick` 延迟，存在竞态条件

* 只清除了当前活跃的 DraggableTags（positive 或 negative），另一个方向的历史未清除

### 修复方案

**将** **`workspaceId`** **加入** **`<keep-alive>`** **的 key**，使不同工作区使用不同的 DraggableTags 实例：

```html
<keep-alive>
    <component
        :is="DraggableTags"
        :key="`${props.workspaceId}-${isPositiveEditor ? 'positive' : 'negative'}`"
        ...
    />
</keep-alive>
```

这样：

* 切换工作区时，旧的 DraggableTags 实例被销毁，新的实例被创建

* 新实例的 `useManualRefHistory` 从空历史开始，不存在跨工作区污染

* 同一工作区内切换 positive/negative 仍然使用 keep-alive 缓存

* 不再需要 watch workspaceId 来清除历史

同时移除之前的 watch workspaceId 逻辑（已不需要）。

***

## 问题2：DraggableTag 内联编辑仍然不生效

### 根因分析

**核心问题：`el-dropdown`** **的 hover 触发与 click-to-edit 行为存在根本性冲突。**

事件流分析：

1. 用户鼠标悬停在标签上 → `el-dropdown`（trigger="hover"，show-timeout=200ms）显示下拉菜单
2. 用户点击标签 → `handleLeftClickPromptTag` 被调用
3. 100ms 后 `editPromptTag` 被调用，设置 `editingPromptTagId`，input 出现
4. 但此时 `el-dropdown` 的下拉菜单仍然可见（鼠标仍在标签上）
5. 下拉菜单可能抢夺焦点，或导致 input 无法正常获取焦点
6. 即使 input 获得焦点，下拉菜单的持续显示也会干扰用户输入

此外，`useHandleClickGesture` 的 100ms 延迟使得交互不直观，用户无法确定单击还是双击。

### 修复方案

**放弃内联编辑模式，改用对话框编辑（ElMessageBox.prompt）**：

1. 移除 `useHandleClickGesture` 的单击/双击区分逻辑
2. 单击标签 → 无特殊行为（保持 el-dropdown 的 hover 交互）
3. 双击标签 → 切换禁用状态（直接绑定 `@dblclick`）
4. 在下拉菜单中为所有可编辑标签添加"编辑"选项
5. 点击"编辑" → 弹出 `ElMessageBox.prompt()` 对话框，用户输入新文本后确认

这种方案的优势：

* 完全避免 el-dropdown 与 inline input 的冲突

* 使用 Element Plus 内置的 prompt 对话框，稳定可靠

* 交互逻辑清晰：hover 看菜单，菜单中点"编辑"

* 移除 `useHandleClickGesture` 的复杂性和延迟

***

## 实施步骤

### 步骤1：修复撤回/重做跨工作区

**文件：`WorkspaceEditor.vue`**

1. 修改 `<keep-alive>` 内 component 的 `:key`，加入 `workspaceId`：

   ```html
   :key="`${props.workspaceId}-${isPositiveEditor ? 'positive' : 'negative'}`"
   ```

2. 移除 watch workspaceId 的逻辑（不再需要）：

   ```typescript
   // 删除以下代码
   watch(() => props.workspaceId, () => {
       nextTick(() => {
           draggableTagsRef.value?.clear()
           nextTick(() => {
               draggableTagsRef.value?.debouncedCommit()
           })
       })
   })
   ```

3. 从 import 中移除 `watch`（如果不再有其他用途）

**文件：`DraggableTags.vue`**

1. 从 `defineExpose` 中移除 `clear`（不再需要外部调用）
2. 从 `useManualRefHistory` 解构中移除 `clear`（不再需要）

### 步骤2：替换内联编辑为对话框编辑

**文件：`DraggableTags.vue`**

1. 移除内联编辑相关的状态和函数：

   * 移除 `editingPromptTagId`、`editingPromptTagInput` ref

   * 移除 `blurConfirmTimer`、`cancelBlurConfirm`、`handleEditBlur`

   * 移除 `editPromptTag`、`confirmEditPrompt`、`cancelEditPrompt` 函数

   * 移除 `useHandleClickGesture` 的使用

2. 新增对话框编辑函数：

   ```typescript
   async function editPromptTag(item: PromptTag): Promise<void> {
       try {
           const { value } = await ElMessageBox.prompt('请输入新内容', '编辑标签', {
               inputValue: isGroupPromptTag(item) ? item.text : promptTagToString(item, true, true, true),
               confirmButtonText: '确认',
               cancelButtonText: '取消',
           })
           if (value) {
               // 复用 confirmEditPrompt 中的替换逻辑
               replacePromptTagContent(item.id, value)
           }
       } catch {
           // 用户取消
       }
   }
   ```

3. 修改模板：

   * 移除 `<input v-if="editingPromptTagId === item.promptTag.id" ...>` 内联编辑 input

   * 移除 `<template v-else>` 包裹，直接显示 Highlighter

   * 将 `@click.left="handleLeftClickPromptTag(item)"` 改为 `@click.left` 无操作或简单处理

   * 添加 `@dblclick.left="toggleDisable(item)"` 用于双击切换禁用

   * 在下拉菜单中为所有可编辑标签添加"编辑"选项

4. 移除 `.inline-edit-input` CSS 样式

5. 移除 `draggableRef` ref（不再需要作用域限定查询）

6. 移除 `useHandleClickGesture` import

***

## 文件变更清单

| 文件                    | 变更类型 | 说明                                                                  |
| --------------------- | ---- | ------------------------------------------------------------------- |
| `WorkspaceEditor.vue` | 修改   | keep-alive key 加入 workspaceId；移除 watch workspaceId                  |
| `DraggableTags.vue`   | 修改   | 移除内联编辑；改用 ElMessageBox.prompt 对话框编辑；移除 useHandleClickGesture；双击切换禁用 |

***

## 风险与注意事项

1. **keep-alive key 变更**：加入 workspaceId 后，切换工作区会销毁旧 DraggableTags 实例。这意味着切换回同一工作区时，标签的折叠状态（collapsed）会丢失。这是可接受的代价，因为折叠状态是临时 UI 状态。
2. **ElMessageBox.prompt**：需要确保在 Electron 环境下 Element Plus 的 MessageBox 正常工作。当前项目已广泛使用 ElMessageBox.confirm，所以应该没有兼容性问题。
3. **双击行为**：使用原生 `@dblclick` 事件替代 `useHandleClickGesture`，更可靠且无延迟。但需要注意双击也会触发两次 click 事件，可能需要 `@click` 中添加防抖或判断。

