# 修复撤回/重做跨工作区问题 + 内联编辑修复 + 操作提示与快捷键系统

## 问题分析

### 问题1：撤回/重做跨工作区

**根因**：
- `DraggableTags.vue` 使用 `useManualRefHistory(editor, { clone: cloneDeep, capacity: 10 })` 跟踪编辑器历史
- `editor` 是 `defineModel`，绑定到 `WorkspaceEditor.vue` 的 `currentEditor` computed
- 当 `workspaceId` 变化（切换工作区）时，`currentEditor` 读取新工作区数据，但 `useManualRefHistory` 的历史栈仍保留旧工作区的记录
- `<keep-alive>` 的 key 仅基于 `isPositiveEditor`（`'positive'`/`'negative'`），不包含 `workspaceId`，导致切换工作区时复用同一个 `DraggableTags` 实例
- `WorkspaceEditor.vue` 的 `handleEditorKeydown` 是全局 `document.addEventListener`，在 `onMounted` 注册、`onUnmounted` 注销。但由于 `Workspace.vue` 被 `App.vue` 的 `<keep-alive>` 缓存，导航到其他页面时 `WorkspaceEditor` 不会 unmount，键盘监听器仍然活跃，可能在非工作区页面误触发 Ctrl+Z/Y

**修复方案**：
1. 在 `DraggableTags.vue` 中，从 `useManualRefHistory` 解构出 `clear` 方法
2. 在 `WorkspaceEditor.vue` 中，watch `workspaceId` 变化时调用 `draggableTagsRef.value?.clear()` 清除历史，并立即 `commit()` 建立新工作区的初始历史点
3. 将 `handleEditorKeydown` 的注册/注销从 `onMounted`/`onUnmounted` 改为 `onActivated`/`onDeactivated`，确保仅在当前页面活跃时响应键盘事件
4. 在 `handleEditorKeydown` 中增加路由守卫检查，确保仅在 `/workspace/:id` 路由下响应

### 问题2：DraggableTag 内联编辑不生效

**根因**：
1. **点击事件冒泡**：内联编辑 input 位于 `el-tag` 内部，点击 input 时事件冒泡到 `el-tag`，触发 `handleLeftClickPromptTag`。100ms 后 `editPromptTag` 被再次调用，重置编辑状态（`editingPromptTagId` 和 `editingPromptTagInput` 被重新赋值），导致输入框内容被覆盖、焦点丢失
2. **Blur 事件冲突**：input 的 `@blur="confirmEditPrompt"` 在用户点击下拉菜单项时触发，导致编辑被提前确认。例如用户点击"命名"菜单项时，input 先失焦触发 confirm，然后菜单项的 click 才执行
3. **querySelector 作用域问题**：`editPromptTag` 使用 `document.querySelector('.inline-edit-input')` 查找 input 元素，在多实例场景下可能找到错误元素

**修复方案**：
1. 在内联编辑 input 上添加 `@click.stop` 和 `@mousedown.stop`，阻止事件冒泡到 `el-tag`
2. 引入 `isConfirmingEdit` 标志位，在 blur 时检查是否由下拉菜单点击导致，若是则延迟确认；或改用 `@blur` 时先检查 `relatedTarget` 是否为下拉菜单项
3. 将 `document.querySelector` 替换为 Vue template ref（`useTemplateRef`），确保精确定位

### 问题3：操作提示和快捷键提示系统

**现状**：
- 所有 tooltip 仅显示功能描述文本，不包含快捷键提示
- 快捷键分散在 3 个文件中（App.vue、WorkspaceEditor.vue、PromptCollection.vue），无统一管理
- 仅 WorkspaceEditor 有一个硬编码的 `el-popover` 操作说明面板
- 无全局快捷键帮助面板
- 无键盘事件 composable/hook

**设计方案**：
1. 创建 `useShortcutRegistry` composable，集中管理所有快捷键定义
2. 增强 tooltip 内容，在功能描述后附加快捷键提示（如 "撤回 (Ctrl+Z)"）
3. 创建 `ShortcutHelpPanel` 全局组件，按 `?` 或 `Ctrl+/` 弹出快捷键速查表
4. 统一操作反馈机制，确保所有关键操作都有成功/失败提示

---

## 实施步骤

### 步骤1：修复撤回/重做跨工作区问题

**文件：`DraggableTags.vue`**
1. 从 `useManualRefHistory` 解构中增加 `clear` 方法：
   ```typescript
   const { commit, canUndo, undo, canRedo, redo, clear } = useManualRefHistory(editor, {
       clone: cloneDeep,
       capacity: 10,
   })
   ```
2. 在 `defineExpose` 中增加 `clear`：
   ```typescript
   defineExpose({ debouncedCommit, canUndo, undo, canRedo, redo, clear, collapseAll, uncollapseAll })
   ```

**文件：`WorkspaceEditor.vue`**
1. 添加 `workspaceId` 的 watcher，当工作区切换时清除历史并重新 commit：
   ```typescript
   watch(() => props.workspaceId, () => {
       nextTick(() => {
           draggableTagsRef.value?.clear()
           nextTick(() => {
               draggableTagsRef.value?.debouncedCommit()
           })
       })
   })
   ```
2. 将 `handleEditorKeydown` 的注册/注销从 `onMounted`/`onUnmounted` 改为 `onActivated`/`onDeactivated`：
   ```typescript
   onActivated(() => {
       document.addEventListener('keydown', handleEditorKeydown)
   })
   onDeactivated(() => {
       document.removeEventListener('keydown', handleEditorKeydown)
   })
   ```
3. 在 `handleEditorKeydown` 中增加路由检查：
   ```typescript
   function handleEditorKeydown(e: KeyboardEvent): void {
       if (!route.path.startsWith('/workspace/')) return
       // ... 原有逻辑
   }
   ```
4. 需要在 `WorkspaceEditor.vue` 中引入 `useRoute`：
   ```typescript
   import { useRoute } from 'vue-router'
   const route = useRoute()
   ```

### 步骤2：修复 DraggableTag 内联编辑模式

**文件：`DraggableTags.vue`**
1. 在内联编辑 input 上添加事件阻止冒泡：
   ```html
   <input
       v-if="editingPromptTagId === item.promptTag.id"
       v-model="editingPromptTagInput"
       class="inline-edit-input"
       spellcheck="false"
       @click.stop
       @mousedown.stop
       @keyup.enter="confirmEditPrompt"
       @keyup.esc="cancelEditPrompt"
       @blur="handleEditBlur"
   />
   ```
2. 替换 `@blur="confirmEditPrompt"` 为 `@blur="handleEditBlur"`，增加延迟确认逻辑防止下拉菜单点击冲突：
   ```typescript
   let blurConfirmTimer: ReturnType<typeof setTimeout> | undefined
   function handleEditBlur(): void {
       blurConfirmTimer = setTimeout(() => {
           confirmEditPrompt()
       }, 150)
   }
   function cancelBlurConfirm(): void {
       clearTimeout(blurConfirmTimer)
   }
   ```
3. 在下拉菜单项的点击处理中调用 `cancelBlurConfirm()`，防止 blur 提前确认：
   - 在 `editPromptTag` 函数开头添加 `cancelBlurConfirm()`
   - 在其他需要保留编辑状态的菜单项点击时也调用 `cancelBlurConfirm()`
4. 将 `editPromptTag` 中的 `document.querySelector` 替换为 template ref：
   ```typescript
   const inlineEditInputRef = ref<HTMLInputElement | null>(null)
   function editPromptTag(item: PromptTag): void {
       cancelBlurConfirm()
       editingPromptTagId.value = item.id
       // ...
       nextTick(() => {
           inlineEditInputRef.value?.focus()
           inlineEditInputRef.value?.select()
       })
   }
   ```
   模板中：
   ```html
   <input ref="inlineEditInputRef" ... />
   ```
   注意：由于 input 在 v-for 内部且有 v-if 条件，需要使用动态 ref 绑定或 `useTemplateRef`。

   实际上由于 v-for 中 ref 的特殊性，更简单的方案是继续使用 querySelector 但限定作用域：
   ```typescript
   function editPromptTag(item: PromptTag): void {
       cancelBlurConfirm()
       editingPromptTagId.value = item.id
       // ...
       nextTick(() => {
           const container = document.querySelector('.vue-draggable')
           const input = container?.querySelector<HTMLInputElement>('.inline-edit-input')
           input?.focus()
           input?.select()
       })
   }
   ```
   或者使用组件根元素 ref 来限定作用域。

### 步骤3：创建快捷键注册中心

**新文件：`src/renderer/src/composables/useShortcutRegistry.ts`**
1. 定义快捷键数据结构：
   ```typescript
   interface ShortcutDef {
       id: string
       keys: string           // 如 "Ctrl+Z", "Ctrl+1"
       description: string    // 功能描述
       category: string       // 分类：'全局' | '编辑器' | '导航' | '标签操作'
       when?: string          // 生效条件描述，如 '工作区页面'
   }
   ```
2. 创建全局快捷键注册表（使用 provide/inject 或 Pinia store）：
   ```typescript
   const shortcuts = ref<ShortcutDef[]>([
       { id: 'nav-prompt', keys: 'Ctrl+1', description: '提示词库', category: '导航' },
       { id: 'nav-workspace', keys: 'Ctrl+2', description: '工作区', category: '导航' },
       { id: 'nav-examples', keys: 'Ctrl+3', description: '示例', category: '导航' },
       { id: 'global-search', keys: 'Ctrl+F', description: '搜索', category: '全局' },
       { id: 'editor-undo', keys: 'Ctrl+Z', description: '撤回', category: '编辑器', when: '工作区页面' },
       { id: 'editor-redo', keys: 'Ctrl+Y', description: '重做', category: '编辑器', when: '工作区页面' },
       { id: 'shortcut-help', keys: 'Ctrl+/', description: '快捷键帮助', category: '全局' },
   ])
   ```
3. 提供 `registerShortcut`、`unregisterShortcut`、`getShortcutsByCategory` 方法
4. 提供 `formatShortcutTooltip(description, keys)` 工具函数，用于在 tooltip 中显示快捷键

### 步骤4：增强 Tooltip 显示快捷键

**修改文件：`WorkspaceEditor.vue`、`App.vue`、`PromptCollection.vue` 等**
1. 将现有 tooltip 内容从纯文本改为包含快捷键的格式：
   - 原：`content="撤回"`
   - 改：`content="撤回 (Ctrl+Z)"`
   - 原：`content="提示词库"`
   - 改：`content="提示词库 (Ctrl+1)"`
2. 对于没有快捷键的操作，保持原样

**具体修改清单**：
- `App.vue`：侧边栏 tooltip 增加 Ctrl+1/2/3 提示
- `WorkspaceEditor.vue`：工具栏 tooltip 增加 Ctrl+Z/Y 提示
- `WorkspaceEditor.vue`：操作说明 popover 内容与快捷键注册中心同步

### 步骤5：创建全局快捷键帮助面板

**新文件：`src/renderer/src/components/ShortcutHelpPanel.vue`**
1. 使用 `el-dialog` 或 `el-drawer` 实现半透明遮罩面板
2. 按 category 分组展示所有快捷键
3. 支持搜索过滤
4. 按 `Ctrl+/` 或 `?` 触发显示/隐藏
5. 样式与项目现有 UI 风格一致（使用 Element Plus + Tailwind CSS）

**模板结构**：
```html
<el-dialog v-model="visible" title="快捷键" width="400px" :show-close="true">
    <el-input v-model="filter" placeholder="搜索快捷键..." clearable />
    <div v-for="category in categories" :key="category">
        <h3>{{ category }}</h3>
        <div v-for="shortcut in filteredShortcuts(category)" :key="shortcut.id">
            <span>{{ shortcut.description }}</span>
            <kbd>{{ shortcut.keys }}</kbd>
        </div>
    </div>
</el-dialog>
```

**注册全局快捷键**：在 `App.vue` 中注册 `Ctrl+/` 触发面板显示

### 步骤6：统一操作反馈机制

**修改文件：各操作组件**
1. 确保所有关键操作都有反馈：
   - 克隆工作区 → 成功/失败提示（已有）
   - 复制到剪贴板 → 成功/失败提示（已有）
   - 添加/删除标签 → 成功/失败提示（部分缺失）
   - 翻译提示词 → 成功/失败提示（已有）
   - 收藏提示词 → 成功/失败提示（已有）
2. 检查并补充缺失的操作反馈

### 步骤7：添加单元测试

**新文件：`src/renderer/src/__tests__/`**
1. 为 `useShortcutRegistry` composable 编写测试
2. 为 `useHandleClickGesture` hook 编写测试（验证单击/双击区分逻辑）
3. 为 `DraggableTags` 的内联编辑逻辑编写测试（验证 blur 延迟确认、事件冒泡阻止）
4. 配置 vitest（在 `electron.vite.config.ts` 中或创建 `vitest.config.ts`）

**测试要点**：
- `useShortcutRegistry`：注册/注销快捷键、按分类查询、格式化 tooltip
- `useHandleClickGesture`：单击延迟触发、双击立即触发、快速连续点击
- 内联编辑：blur 延迟确认、cancelBlurConfirm 取消确认、事件冒泡阻止

---

## 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/renderer/src/components/DraggableTags.vue` | 修改 | 解构 clear、暴露 clear、修复内联编辑事件冒泡和 blur 冲突、替换 querySelector |
| `src/renderer/src/components/WorkspaceEditor.vue` | 修改 | watch workspaceId 清除历史、onActivated/onDeactivated 替代 onMounted/onUnmounted、路由检查、tooltip 增加快捷键 |
| `src/renderer/src/App.vue` | 修改 | tooltip 增加快捷键提示、注册 Ctrl+/ 全局快捷键、引入 ShortcutHelpPanel |
| `src/renderer/src/composables/useShortcutRegistry.ts` | 新建 | 快捷键注册中心 composable |
| `src/renderer/src/components/ShortcutHelpPanel.vue` | 新建 | 全局快捷键帮助面板组件 |
| `src/renderer/src/__tests__/useShortcutRegistry.test.ts` | 新建 | 快捷键注册中心单元测试 |
| `src/renderer/src/__tests__/useHandleClickGesture.test.ts` | 新建 | 点击手势 hook 单元测试 |
| `vitest.config.ts` 或 `electron.vite.config.ts` | 修改/新建 | 配置 vitest 测试环境 |

---

## 风险与注意事项

1. **keep-alive 缓存**：`WorkspaceEditor` 的 `onActivated`/`onDeactivated` 依赖 `<keep-alive>` 的正确触发。需确认 `App.vue` 中 `<keep-alive>` 对 `Workspace` 组件的缓存行为正确
2. **blur 延迟确认**：150ms 的延迟需要在下拉菜单点击时被正确取消，否则编辑会被意外确认。需仔细测试各种交互场景
3. **快捷键冲突**：`Ctrl+/` 在某些浏览器中有默认行为，需 `preventDefault()`
4. **内存管理**：快捷键注册中心使用全局状态，需确保组件卸载时清理注册
5. **测试环境**：项目目前无测试文件，需配置 vitest 环境，注意 Electron 环境的 mock
