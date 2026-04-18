# 分组 Pattern 优化计划

## 需求概述

在工作区编辑器的"编辑模式"下，引入分组 pattern 语法来标记一组标签属于同一分组。当从编辑模式切换到显示模式时，`stringToEditor` 识别该 pattern 并将对应标签聚合为 `GroupPromptTag`。工具栏的复制按钮不会复制分组 pattern。

## 分组 Pattern 设计

采用 `【组名】...【/】` 作为分组 pattern 语法（有明确的起止标记），理由：

* `【】` 是中文全角方括号，不会与现有的 `()`、`[]` 权重/括号语法冲突

* 在 AI 绘画 prompt 中几乎不会出现，避免误识别

* 语义直观，易于理解

* **有明确的结束标记** **`【/】`**，可以精确区分分组内标签和分组外自由标签

**编辑模式下的文本格式示例：**

```
free_tag1, 【背景】sky, cloud, mountain【/】, free_tag2, 【人物】girl, dress, hat【/】, 【细节】detailed eyes, beautiful hair【/】
```

**切换到显示模式后，生成 3 个 GroupPromptTag + 2 个自由标签：**

* `MonoPromptTag { text: "free_tag1" }`

* `GroupPromptTag { text: "背景", subTags: [sky, cloud, mountain] }`

* `MonoPromptTag { text: "free_tag2" }`

* `GroupPromptTag { text: "人物", subTags: [girl, dress, hat] }`

* `GroupPromptTag { text: "细节", subTags: [detailed eyes, beautiful hair] }`

**关键优势**：自由标签 `free_tag1` 和 `free_tag2` 不在 `【】...【/】` 范围内，不会被误归入任何分组。

## 实现步骤

### 1. 修改 `editorToString` — 编辑模式下输出分组 pattern

**文件**: `src/shared/models/prompt-tag.ts`

在 `editorToString` 函数中，当遇到 `GroupPromptTag` 时，输出 `【组名】` 开头标记 + 子标签内容 + `【/】` 结束标记。

**修改逻辑**：

```typescript
if (isGroupPromptTag(tag)) {
    if (tag.disabled && removeDisabled) continue
    const subTexts = tag.subTags
        .filter((sub) => !(sub.disabled && removeDisabled))
        .map((sub) => promptTagToString(sub, true, true, true, removeDisabled))
        .filter((s) => s.length > 0)
    if (subTexts.length > 0) {
        if (includeGroupPattern) {
            segments.push(`【${tag.text}】`)
            segments.push(subTexts.join(', '))
            segments.push('【/】')
        } else {
            segments.push(subTexts.join(', '))
        }
        segments.push(', ')
    }
}
```

### 2. 修改 `stringToEditor` — 识别分组 pattern 并聚合为 GroupPromptTag

**文件**: `src/shared/models/prompt-tag.ts`

在 `stringToEditor` 函数中，在解析逗号分割后的标签字符串之前，先识别 `【组名】...【/】` pattern，将范围中的标签聚合到对应分组中。

**修改逻辑**：

1. 在 `splitStringIgnoringBrackets` 分割之后，遍历解析出的标签字符串
2. 用正则 `【(.+?)】` 检测分组开始标记，用 `【/】` 检测分组结束标记
3. 当检测到分组开始标记时，记录当前分组名，后续标签归入该分组
4. 当检测到 `【/】` 时，结束当前分组，生成 `GroupPromptTag`
5. 不在分组范围内的标签按普通标签处理

### 3. 修改 `editorToString`（复制用） — 不输出分组 pattern

**文件**: `src/shared/models/prompt-tag.ts`

为 `editorToString` 添加一个 `includeGroupPattern` 参数（默认 `true`），当从复制按钮调用时传 `false`，此时 `GroupPromptTag` 只输出子标签内容，不输出 `【组名】` 前缀。

**修改签名**：

```typescript
export function editorToString(
    editor: PromptTag[],
    removeDisabled: boolean = true,
    removeLora: boolean = false,
    includeGroupPattern: boolean = true  // 新增参数
): string
```

当 `includeGroupPattern = false` 时，GroupPromptTag 的处理逻辑回退到当前的 `promptTagToString` 行为（只输出子标签文本，逗号分隔）。

### 4. 修改 `useEditorClipboard` — 复制时不包含分组 pattern

**文件**: `src/renderer/src/hooks/useEditorClipboard.ts`

在 `copyEditor` 函数中，调用 `editorToString` 时传入 `includeGroupPattern = false`：

```typescript
const text = editorToString(candidates, true, removeLora.value, false)
```

### 5. 修改 `useEditorMode` — 编辑模式切换时正确处理分组

**文件**: `src/renderer/src/hooks/useEditorMode.ts`

* 从显示模式切到编辑模式时：`editorToString(currentEditor.value, false)` — 默认 `includeGroupPattern = true`，会输出 `【组名】` pattern

* 从编辑模式切回显示模式时：`stringToEditor(editorInput.value, specialTexts())` — 已在步骤 2 中支持识别分组 pattern

无需额外修改，现有逻辑自动适配。

### 6. 修改 `promptTagToString` — 确保一致性

**文件**: `src/shared/models/prompt-tag.ts`

`promptTagToString` 中 `GroupPromptTag` 的处理保持不变（只输出子标签内容，逗号分隔），因为它用于单个标签的文本表示（如右键复制、编辑弹窗等），不应包含分组 pattern。

## 修改文件清单

| 文件                                             | 修改内容                                                                                                                                          |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/shared/models/prompt-tag.ts`              | 1. `editorToString` 增加 `includeGroupPattern` 参数，GroupPromptTag 根据 flag 决定是否输出 pattern2. `stringToEditor` 增加分组 pattern 识别逻辑，聚合为 GroupPromptTag |
| `src/renderer/src/hooks/useEditorClipboard.ts` | `copyEditor` 调用 `editorToString` 时传入 `includeGroupPattern = false`                                                                            |

## 边界情况处理

1. **空分组名**：`【】...【/】` — 忽略，不创建分组，标签按普通标签处理
2. **分组 pattern 后无标签**：`【背景】【/】` — 创建空的 GroupPromptTag（subTags 为空数组）
3. **缺少结束标记**：`【背景】sky, cloud` 没有 `【/】` — 不会创建分组，`【背景】` 被忽略，标签按普通标签处理
4. **嵌套分组 pattern**：不支持嵌套，遇到新的 `【组名】` 时先结束当前分组再开始新分组
5. **分组 pattern 跨换行**：换行符（EOL）不会结束当前分组，只有 `【/】` 才会结束分组
6. **Special 标签**：Special 标签不会结束当前分组，只有 `【/】` 才会结束分组
7. **已有 GroupPromptTag 的编辑**：从显示模式切到编辑模式时正确输出 pattern，切回时正确还原
8. **右键复制单个标签**：右键复制使用 `promptTagToString`，不受影响，GroupPromptTag 的右键复制只输出子标签内容

