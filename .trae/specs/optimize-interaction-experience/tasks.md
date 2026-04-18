# Tasks

- [x] Task 1: 数据层优化 — 建立索引与优化保存机制
  - [x] SubTask 1.1: 在 `data.ts` 中为 prompts、tags、examples、images、workspaces 建立 `Map<id, entity>` 索引，数据更新时自动维护索引
  - [x] SubTask 1.2: 在 `data.ts` 中添加 `isDirty` 标记（按数据类型分别标记），数据修改时标记为脏，保存后清除标记
  - [x] SubTask 1.3: 修改定时保存逻辑，仅对脏数据执行 `cloneDeep` 和 IPC 传输，保存后清除脏标记
  - [x] SubTask 1.4: 在 `data.ts` 中添加 `isDataLoaded` 响应式状态，数据首次加载完成后设为 true

- [x] Task 2: 全局加载状态
  - [x] SubTask 2.1: 在 `base.css` 中添加骨架屏和加载动画的样式
  - [x] SubTask 2.2: 在 `App.vue` 中根据 `isDataLoaded` 显示全局加载指示器，数据加载完成前显示加载动画
  - [x] SubTask 2.3: 在 `PromptCollection.vue`、`WorkspaceList.vue`、`ExampleList.vue` 中，数据未加载时显示骨架屏而非空状态

- [x] Task 3: 异步操作反馈
  - [x] SubTask 3.1: 在 `DraggableTags.vue` 中为翻译操作添加加载状态（按钮旋转图标）和结果反馈（成功/失败提示）
  - [x] SubTask 3.2: 在 `PromptDetail.vue` 中为翻译按钮添加加载状态和结果反馈
  - [x] SubTask 3.3: 在 `Gallery.vue` 中优化图片批量添加的进度反馈（显示"N/M 已处理"）
  - [x] SubTask 3.4: 在 `App.vue` 或状态栏中添加数据保存状态提示（"已保存"淡入淡出）

- [x] Task 4: 统一错误处理
  - [x] SubTask 4.1: 创建统一的错误处理工具函数 `handleError(error, context)`，封装 `ElMessage.error` 调用
  - [x] SubTask 4.2: 为 `PromptDetail.vue`、`WorkspaceEditor.vue`、`ExampleView.vue` 中的 TODO 场景（ID 不合法/资源不存在）添加友好提示和返回导航
  - [x] SubTask 4.3: 为 `DraggableTags.vue` 的 `translatePromptTag` 添加 try/catch 和错误反馈
  - [x] SubTask 4.4: 为 `WorkspaceEditor.vue` 的 `copyEditor` 等缺少 try/catch 的 async 函数添加错误处理

- [x] Task 5: 交互延迟优化
  - [x] SubTask 5.1: 优化 `useHandleClickGesture.ts`，将单击延迟从 200ms 降至 100ms，或改用其他交互模式（如单击直接编辑、Ctrl+单击切换禁用）
  - [x] SubTask 5.2: 将 `DraggableTags.vue` 中悬浮菜单的 `show-timeout` 从 300ms 降至 200ms

- [x] Task 6: 键盘快捷键
  - [x] SubTask 6.1: 在 `App.vue` 中注册全局键盘快捷键：Ctrl+1/2/3 切换页面，Ctrl+F 聚焦搜索框
  - [x] SubTask 6.2: 在 `WorkspaceEditor.vue` 中绑定 Ctrl+Z/Y 到撤销/重做操作
  - [x] SubTask 6.3: 在 `PromptCollection.vue` 中为选中项绑定 Delete 键删除
  - [x] SubTask 6.4: 在搜索输入框中添加 Escape 键清空搜索内容的功能

- [x] Task 7: 删除确认与复制反馈统一
  - [x] SubTask 7.1: 将 `TagCollection.vue` 和 `ExampleList.vue` 中的 `ElMessageBox.confirm` 替换为 `el-popconfirm`
  - [x] SubTask 7.2: 统一所有复制操作的反馈消息：成功统一为"已复制到剪贴板"，失败统一为"复制失败，请重试"

- [x] Task 8: 搜索防抖
  - [x] SubTask 8.1: 在 `PromptCollection.vue` 中为搜索输入添加 300ms 防抖
  - [x] SubTask 8.2: 在 `Workspace.vue` 中为搜索输入添加 300ms 防抖

- [x] Task 9: 导航层级优化
  - [x] SubTask 9.1: 在 `Workspace.vue` 页面顶部添加面包屑导航（"工作区 > 工作区名称"），点击"工作区"返回列表
  - [x] SubTask 9.2: 在 `App.vue` 侧边栏中，当用户在 Workspace 页面时，tooltip 显示当前工作区名称

- [x] Task 10: 统一空状态组件
  - [x] SubTask 10.1: 创建 `EmptyState.vue` 通用组件，接受 icon、title、description 属性
  - [x] SubTask 10.2: 在 `PromptCollection.vue`、`TagCollection.vue`、`WorkspaceList.vue`、`ExampleList.vue` 中替换自定义空状态为 `EmptyState` 组件

- [x] Task 11: 翻译功能降级
  - [x] SubTask 11.1: 在 `other.ts` 的 `translateByDeepLX` 中添加 10 秒超时设置（使用 AbortController）
  - [x] SubTask 11.2: 在翻译失败时返回明确的错误信息，前端根据错误类型显示不同的提示（超时/服务不可用/其他错误）

- [x] Task 12: 图片并行处理
  - [x] SubTask 12.1: 修改 `image.ts` 的 `createImages`，使用并行处理（最多同时 3 个），替代串行处理

- [x] Task 13: 操作可发现性增强
  - [x] SubTask 13.1: 在 `DraggableTags.vue` 的悬浮菜单中为图标按钮添加文字说明（tooltip）
  - [x] SubTask 13.2: 在 `WorkspaceEditor.vue` 的信息弹窗中优化操作说明文案，使其更直观

- [x] Task 14: 编辑模式一致性
  - [x] SubTask 14.1: 在 `DraggableTags.vue` 中将标签编辑从对话框模式改为内联编辑模式（单击进入编辑、Enter 确认、Escape 取消）
  - [x] SubTask 14.2: 确保 `PromptDetail.vue` 和 `TagEditor.vue` 的编辑模式保持即时保存风格

# Task Dependencies
- Task 1 是 Task 2 和 Task 8 的基础（数据索引和加载状态依赖数据层优化）
- Task 2 依赖 Task 1（需要 isDataLoaded 状态）
- Task 4 可与 Task 1 并行
- Task 5 可独立进行
- Task 6 可独立进行
- Task 7 可独立进行
- Task 8 依赖 Task 1（搜索防抖配合数据索引优化效果更好）
- Task 9 可独立进行
- Task 10 可独立进行
- Task 11 可独立进行
- Task 12 可独立进行
- Task 13 可独立进行
- Task 14 可独立进行
- Task 3、5、6、7、9、10、11、12、13、14 之间无依赖关系，可并行
