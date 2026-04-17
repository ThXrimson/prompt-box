# Tasks

- [x] Task 1: 建立设计令牌系统
  - [x] SubTask 1.1: 在 `base.css` 中定义完整的色彩令牌（主色、语义色、中性色梯度、背景色、边框色、文字色）
  - [x] SubTask 1.2: 在 `base.css` 中定义间距令牌和圆角令牌
  - [x] SubTask 1.3: 在 `base.css` 中定义阴影令牌
  - [x] SubTask 1.4: 清理 `base.css` 中旧的暗色主题变量，统一为亮色主题设计令牌

- [x] Task 2: 优化全局样式和滚动条
  - [x] SubTask 2.1: 优化 `main.css` 中的全局样式，使用设计令牌替换硬编码值
  - [x] SubTask 2.2: 统一优化 `scrollbar.css` 中的滚动条样式，使用设计令牌

- [x] Task 3: 优化侧边导航栏（App.vue）
  - [x] SubTask 3.1: 改进侧边导航栏的视觉设计（背景色、内边距、图标样式）
  - [x] SubTask 3.2: 添加导航项的悬停效果和选中高亮样式

- [x] Task 4: 优化 Navigator 组件
  - [x] SubTask 4.1: 改进 Navigator 组件的视觉层次（背景色、底部边框/阴影）
  - [x] SubTask 4.2: 优化 Navigator 内部元素的间距和对齐

- [x] Task 5: 优化提示词库页面（PromptCollection.vue）
  - [x] SubTask 5.1: 优化列表面板的视觉设计（边框、内边距、列表项间距和选中效果）
  - [x] SubTask 5.2: 优化详情面板的视觉设计（区域划分、表单样式）
  - [x] SubTask 5.3: 优化搜索栏和过滤器的布局和样式
  - [x] SubTask 5.4: 添加空状态提示

- [x] Task 6: 优化 PromptCard 组件
  - [x] SubTask 6.1: 优化卡片色彩方案（选中/未选中状态色彩）
  - [x] SubTask 6.2: 优化卡片信息层次（文本、翻译、操作按钮）
  - [x] SubTask 6.3: 优化 LORA 标识和图片图标的样式

- [x] Task 7: 优化 TagList 和 TagCollection 组件
  - [x] SubTask 7.1: 优化 TagList 的色彩方案和交互反馈
  - [x] SubTask 7.2: 优化 TagCollection 的布局和视觉设计
  - [x] SubTask 7.3: 添加空状态提示

- [x] Task 8: 优化工作区列表页面（WorkspaceList.vue）
  - [x] SubTask 8.1: 优化工作区卡片的视觉风格（边框、阴影、圆角）
  - [x] SubTask 8.2: 优化操作按钮的布局和交互反馈
  - [x] SubTask 8.3: 添加空状态提示

- [x] Task 9: 优化工作区页面（Workspace.vue）
  - [x] SubTask 9.1: 优化导航栏区域的布局和样式
  - [x] SubTask 9.2: 优化标签列表和标签集合的布局比例

- [x] Task 10: 优化 WorkspaceEditor 组件
  - [x] SubTask 10.1: 优化工具栏按钮的视觉分组（添加分隔线或分组容器）
  - [x] SubTask 10.2: 改进拖拽手柄的视觉设计
  - [x] SubTask 10.3: 优化正/负面切换的视觉指示

- [x] Task 11: 优化 DraggableTags 组件
  - [x] SubTask 11.1: 优化标签的色彩方案，使用设计令牌
  - [x] SubTask 11.2: 优化下拉菜单的样式
  - [x] SubTask 11.3: 优化标签的过渡动画

- [x] Task 12: 优化示例列表页面（ExampleList.vue）
  - [x] SubTask 12.1: 优化图片展示的视觉设计（尺寸、圆角、悬停效果）
  - [x] SubTask 12.2: 优化空封面的视觉设计
  - [x] SubTask 12.3: 优化分页和操作按钮的布局

- [x] Task 13: 优化 ExampleView 和 Gallery 组件
  - [x] SubTask 13.1: 优化 ExampleView 的布局和视觉设计
  - [x] SubTask 13.2: 优化 Gallery 的图片展示和操作按钮样式
  - [x] SubTask 13.3: 优化 ImageCover 的空状态设计

- [x] Task 14: 优化 TagEditor 组件
  - [x] SubTask 14.1: 优化标签编辑器的表格和对话框样式

- [x] Task 15: 优化 PromptDetail 组件
  - [x] SubTask 15.1: 优化详情区域的视觉层次和间距
  - [x] SubTask 15.2: 优化表单元素的统一样式

- [x] Task 16: 统一对话框样式
  - [x] SubTask 16.1: 在全局样式中统一 el-dialog 的圆角、阴影、内边距

- [x] Task 17: 添加全局过渡动画
  - [x] SubTask 17.1: 为页面切换添加过渡动画
  - [x] SubTask 17.2: 优化列表项的进入/退出动画

# Task Dependencies
- Task 1 是所有后续任务的基础，必须最先完成
- Task 2 依赖 Task 1
- Task 3 ~ Task 17 依赖 Task 1 和 Task 2
- Task 5 和 Task 6 可并行
- Task 7 依赖 Task 6（TagCollection 使用 PromptCard）
- Task 10 和 Task 11 可并行
- Task 12 和 Task 13 可并行
