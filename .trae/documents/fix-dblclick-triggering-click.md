# 修复 DraggableTags.vue 双击触发单击的问题

## 问题分析

在 [DraggableTags.vue:543-544](file:///d:/work_space/code/prompt-box/src/renderer/src/components/DraggableTags.vue#L543-L544) 中：

```html
@click.left="switchCollapse(item.promptTag)"
@dblclick.left="toggleDisable(item)"
```

浏览器事件机制决定了：双击时，会依次触发 `click` → `click` → `dblclick`。因此用户双击时，`switchCollapse` 会被调用两次，`toggleDisable` 被调用一次，导致折叠/展开状态被意外切换。

## 解决方案

使用延迟判断单击的方式：在 `click` 事件中设置一个短定时器（如 250ms），如果在此期间没有第二次点击，则执行单击逻辑；如果检测到第二次点击（即双击），则取消单击逻辑，只执行双击逻辑。

### 实现步骤

1. **添加响应式变量**：新增一个 `clickTimer` ref，用于存储单击定时器 ID。

2. **创建 `handleClick` 方法**：
   - 清除之前的定时器（防止重复）
   - 设置 250ms 延迟定时器，到期后执行 `switchCollapse`
   - 将定时器 ID 存入 `clickTimer`

3. **创建 `handleDblClick` 方法**：
   - 清除 `clickTimer` 中的定时器，阻止单击逻辑执行
   - 执行 `toggleDisable`

4. **修改模板绑定**：
   - 将 `@click.left="switchCollapse(item.promptTag)"` 改为 `@click.left="handleClick(item.promptTag)"`
   - 将 `@dblclick.left="toggleDisable(item)"` 改为 `@dblclick.left="handleDblClick(item)"`

### 具体代码变更

**Script 部分** — 新增变量和方法：

```ts
const clickTimer = ref<ReturnType<typeof setTimeout> | null>(null)

function handleClick(promptTag: PromptTag): void {
    if (clickTimer.value !== null) {
        clearTimeout(clickTimer.value)
    }
    clickTimer.value = setTimeout(() => {
        clickTimer.value = null
        switchCollapse(promptTag)
    }, 250)
}

function handleDblClick(item: Wrapper): void {
    if (clickTimer.value !== null) {
        clearTimeout(clickTimer.value)
        clickTimer.value = null
    }
    toggleDisable(item)
}
```

**Template 部分** — 修改事件绑定：

```html
@click.left="handleClick(item.promptTag)"
@dblclick.left="handleDblClick(item)"
```

## 影响范围

- 仅修改 `DraggableTags.vue` 一个文件
- 不影响右键复制、中键删除等其他交互
- 单击操作会有约 250ms 的延迟（这是区分单击/双击的必要代价）
