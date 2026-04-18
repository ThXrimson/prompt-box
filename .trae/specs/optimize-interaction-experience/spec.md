# 交互体验全面优化 Spec

## Why
当前 Prompt Box 虽然完成了视觉层面的 UI 优化，但在交互体验方面仍存在诸多痛点：缺少加载状态和操作反馈导致用户无法判断应用状态；核心操作（单击/双击区分）存在延迟感；键盘快捷键缺失影响操作效率；交互模式不一致增加学习成本；搜索无防抖、数据查找 O(n²) 等性能问题影响响应速度；导航层级扁平导致深层页面迷失方向。需要系统性地优化交互体验，提升用户操作效率、满意度和整体使用感受。

## What Changes
- 添加全局和局部加载状态指示，确保数据加载时有明确反馈
- 为异步操作（翻译、图片处理、数据保存）添加加载和进度反馈
- 统一错误处理模式，补全缺失的 TODO 错误处理
- 优化单击/双击交互延迟，改善核心操作流畅度
- 添加常用键盘快捷键（搜索、撤销/重做、页面切换、删除）
- 统一删除确认方式（el-popconfirm）和复制反馈消息
- 为搜索输入添加防抖，优化大数据量下的响应速度
- 建立数据索引 Map 替代线性查找，优化计算属性性能
- 优化定时保存机制，避免不必要的全量保存
- 改进导航层级，为 Workspace 页面添加面包屑/返回按钮
- 统一空状态组件，减少代码重复
- 为翻译功能添加超时和降级方案
- 为图片批量处理添加并行支持
- 改善拖拽排序的可发现性和操作提示
- 统一编辑模式交互，减少认知负担

## Impact
- Affected specs: optimize-ui-ux（视觉优化已完成，本次为交互层优化，不冲突）
- Affected code:
  - `src/renderer/src/stores/data.ts` - 数据加载状态、索引优化、保存机制
  - `src/renderer/src/stores/error.ts` - 错误处理统一
  - `src/renderer/src/hooks/useHandleClickGesture.ts` - 交互延迟优化
  - `src/renderer/src/hooks/useLongPress.ts` - 长按交互实现
  - `src/renderer/src/views/PromptCollection.vue` - 加载状态、搜索防抖、键盘快捷键
  - `src/renderer/src/views/Workspace.vue` - 导航优化、搜索防抖
  - `src/renderer/src/views/WorkspaceList.vue` - 删除确认统一
  - `src/renderer/src/views/ExampleList.vue` - 删除确认统一
  - `src/renderer/src/components/PromptCard.vue` - 复制反馈统一
  - `src/renderer/src/components/PromptDetail.vue` - 加载状态、错误处理
  - `src/renderer/src/components/TagCollection.vue` - 性能优化、删除确认统一
  - `src/renderer/src/components/TagList.vue` - 交互优化
  - `src/renderer/src/components/TagEditor.vue` - 错误处理统一
  - `src/renderer/src/components/DraggableTags.vue` - 操作提示、翻译反馈
  - `src/renderer/src/components/WorkspaceEditor.vue` - 键盘快捷键、操作提示
  - `src/renderer/src/components/Gallery.vue` - 加载反馈
  - `src/renderer/src/components/ExampleView.vue` - 错误处理
  - `src/renderer/src/App.vue` - 全局键盘快捷键、导航优化
  - `src/renderer/src/assets/base.css` - 加载动画样式
  - `src/main/handlers/other.ts` - 翻译超时和降级
  - `src/main/handlers/image.ts` - 图片并行处理

## ADDED Requirements

### Requirement: 全局加载状态
系统 SHALL 在应用启动和数据加载期间显示全局加载状态指示，确保用户能区分"数据为空"和"数据正在加载"。

#### Scenario: 应用启动加载
- **WHEN** 应用启动并加载数据
- **THEN** 显示全局加载指示器（如骨架屏或加载动画），直到所有核心数据加载完成

#### Scenario: 数据加载完成
- **WHEN** 核心数据加载完成
- **THEN** 加载指示器消失，显示实际内容；如果数据为空则显示空状态提示

### Requirement: 异步操作反馈
系统 SHALL 为所有异步操作（翻译、图片处理、数据保存等）提供加载状态和结果反馈。

#### Scenario: 翻译操作反馈
- **WHEN** 用户触发翻译操作
- **THEN** 翻译按钮显示加载状态（如旋转图标），翻译完成后显示成功或失败的提示消息

#### Scenario: 图片批量添加反馈
- **WHEN** 用户批量添加图片
- **THEN** 显示进度指示（如"N/M 已处理"），每张图片处理完成后更新进度

#### Scenario: 数据保存反馈
- **WHEN** 数据保存操作完成
- **THEN** 在状态栏或角落显示简短的保存状态提示（如"已保存"），不干扰用户操作

### Requirement: 统一错误处理
系统 SHALL 建立统一的错误处理模式，所有异步操作 SHALL 使用 try/catch 包裹，并通过统一的方式向用户展示错误信息。

#### Scenario: 操作失败提示
- **WHEN** 任何异步操作失败（如网络请求超时、数据验证失败）
- **THEN** 显示明确的错误提示消息，包含错误原因和建议的后续操作

#### Scenario: 未处理 TODO 补全
- **WHEN** 用户访问不存在的资源（如无效的 prompt ID、workspace ID、example ID）
- **THEN** 显示友好的"未找到"提示，并提供返回导航

### Requirement: 交互延迟优化
系统 SHALL 优化核心交互的响应延迟，消除不必要的等待时间。

#### Scenario: 单击响应优化
- **WHEN** 用户单击标签（如 DraggableTags 中的标签）
- **THEN** 单击操作在 100ms 内响应，不再因等待双击判定而产生明显延迟

#### Scenario: 悬浮菜单响应
- **WHEN** 用户悬停在标签上
- **THEN** 操作菜单在 200ms 内显示，比当前的 300ms 更快

### Requirement: 键盘快捷键
系统 SHALL 提供常用键盘快捷键，提升操作效率。

#### Scenario: 全局搜索快捷键
- **WHEN** 用户按下 Ctrl+F / Cmd+F
- **THEN** 当前页面的搜索框获得焦点

#### Scenario: 撤销/重做快捷键
- **WHEN** 用户在 WorkspaceEditor 中按下 Ctrl+Z / Ctrl+Y
- **THEN** 执行撤销/重做操作

#### Scenario: 页面切换快捷键
- **WHEN** 用户按下 Ctrl+1/2/3
- **THEN** 切换到对应的页面（提示词库/工作区/示例）

#### Scenario: 删除快捷键
- **WHEN** 用户选中项目后按下 Delete 键
- **THEN** 触发删除确认流程

### Requirement: 删除确认统一
系统 SHALL 统一所有删除操作的确认方式，使用 el-popconfirm 替代 ElMessageBox.confirm。

#### Scenario: 删除确认一致性
- **WHEN** 用户在任何位置触发删除操作
- **THEN** 统一使用 el-popconfirm 弹出确认，确认文案风格一致

### Requirement: 复制反馈统一
系统 SHALL 统一所有复制操作的反馈消息。

#### Scenario: 复制成功反馈
- **WHEN** 用户执行复制操作成功
- **THEN** 统一显示"已复制到剪贴板"的成功提示

#### Scenario: 复制失败反馈
- **WHEN** 用户执行复制操作失败
- **THEN** 统一显示"复制失败，请重试"的错误提示

### Requirement: 搜索防抖
系统 SHALL 为所有搜索输入添加防抖处理，避免频繁触发过滤计算。

#### Scenario: 搜索输入防抖
- **WHEN** 用户在搜索框中输入文字
- **THEN** 实际的搜索过滤在用户停止输入 300ms 后执行，而非每次按键都触发

### Requirement: 数据索引优化
系统 SHALL 建立基于 Map 的数据索引，替代线性查找，提升大数据量下的响应速度。

#### Scenario: ID 查找优化
- **WHEN** 组件需要通过 ID 查找数据实体（prompt、tag、example、image 等）
- **THEN** 使用 Map 索引进行 O(1) 查找，而非遍历数组进行 O(n) 查找

#### Scenario: 关联数据查找优化
- **WHEN** 组件需要查找关联数据（如通过 example 查找 images、通过 tag 查找 prompts）
- **THEN** 使用预构建的关联索引，避免 O(n²) 或 O(n³) 的嵌套遍历

### Requirement: 保存机制优化
系统 SHALL 优化定时保存机制，避免不必要的数据克隆和写入。

#### Scenario: 脏数据标记保存
- **WHEN** 定时保存触发时
- **THEN** 仅保存标记为脏（已修改）的数据，未修改的数据不进行 cloneDeep 和 IPC 传输

#### Scenario: 单条更新去重
- **WHEN** 单条数据更新后立即通过 IPC 同步
- **THEN** 该数据在下次定时保存时不再重复写入

### Requirement: 导航层级优化
系统 SHALL 改进深层页面的导航体验，确保用户不会迷失方向。

#### Scenario: Workspace 页面返回导航
- **WHEN** 用户从工作区列表进入某个工作区
- **THEN** 页面顶部显示面包屑导航（如"工作区 > 工作区名称"），点击"工作区"可返回列表

#### Scenario: 侧边栏当前状态指示
- **WHEN** 用户在某个 Workspace 页面
- **THEN** 侧边栏"工作区"项保持高亮，且可通过 tooltip 显示当前工作区名称

### Requirement: 统一空状态组件
系统 SHALL 创建统一的空状态组件，替代各页面中重复实现的空状态逻辑。

#### Scenario: 空状态组件使用
- **WHEN** 任何列表或集合需要显示空状态
- **THEN** 使用统一的 EmptyState 组件，传入图标、标题和描述即可

### Requirement: 翻译功能降级
系统 SHALL 为翻译功能添加超时设置和降级方案。

#### Scenario: 翻译超时处理
- **WHEN** 翻译请求超过 10 秒未响应
- **THEN** 取消请求并显示"翻译超时，请稍后重试"的提示

#### Scenario: 翻译服务不可用
- **WHEN** 翻译服务返回错误或网络不可达
- **THEN** 显示"翻译服务暂不可用"的提示，并建议用户稍后重试

### Requirement: 图片并行处理
系统 SHALL 支持图片批量添加时的并行处理，提升处理速度。

#### Scenario: 批量图片并行处理
- **WHEN** 用户一次添加多张图片
- **THEN** 图片处理以并行方式执行（最多同时处理 3 张），而非串行处理

### Requirement: 操作可发现性增强
系统 SHALL 增强隐藏操作的可发现性，让用户更容易发现和使用高级交互。

#### Scenario: 拖拽操作提示
- **WHEN** 用户首次使用包含拖拽功能的页面
- **THEN** 显示简短的操作提示（如"拖拽可排序"），用户关闭后不再显示

#### Scenario: 快捷操作提示
- **WHEN** 用户悬停在标签上
- **THEN** 在操作菜单中清晰标注各操作的含义，而非仅显示图标

### Requirement: 编辑模式一致性
系统 SHALL 统一各处的编辑交互模式，减少用户的学习成本。

#### Scenario: 内联编辑模式
- **WHEN** 用户在列表或卡片中编辑文本（如标签名称、提示词文本）
- **THEN** 统一使用内联编辑模式（点击进入编辑、Enter 确认、Escape 取消），而非混用对话框和内联编辑

#### Scenario: 详情面板编辑模式
- **WHEN** 用户在详情面板中编辑数据
- **THEN** 统一使用即时保存模式（v-model.lazy），编辑后自动保存，无需手动点击保存按钮

## MODIFIED Requirements
无

## REMOVED Requirements
无
