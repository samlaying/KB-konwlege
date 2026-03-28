# 步骤 4：改造 Zustand 数据层

目标：把 `src/app/store/index.ts` 从内存 Mock 仓库改成真实异步状态层。

## 当前代码现状

- [`F:\samlay\KB-konwlege\src\app\store\index.ts`](F:\samlay\KB-konwlege\src\app\store\index.ts) 里定义了完整的 Mock 数据
- `addTheme`、`addDocument`、`addConversation` 等方法都是同步内存写入
- 当前 `currentConversation` 只靠本地内存保持，刷新页面会丢失
- `documents` 和 `themes` 的统计联动是前端自己算的，接入后端后要改成以后端为准

## 需要调整的方向

- 删除 `mockThemes`、`mockDocuments`、`mockConversations`
- 所有增删改查动作改成异步
- 增加全局或模块级的 `loading`、`error`
- 初始化时从后端拉取主题、文档、对话、设置
- 必要时使用 `persist` 做轻量本地缓存

## 建议改造方式

- `loadInitialData()`
- `createTheme() / updateTheme() / removeTheme()`
- `loadDocuments(themeId?)`
- `createConversation() / loadConversationDetail(id)`
- `saveSettings(payload)`

## 建议增加的状态字段

- `isBootstrapping`
- `themeLoading`
- `documentLoading`
- `conversationLoading`
- `settingsLoading`
- `chatStreaming`
- `lastError`

## 推荐的 store 设计原则

- store 负责业务状态，不负责网络细节
- 具体请求全部调 [`F:\samlay\KB-konwlege\src\app\services\api.ts`](F:\samlay\KB-konwlege\src\app\services\api.ts)
- 对话详情和对话列表分开维护，避免每次列表刷新都覆盖当前消息
- 只有 `selectedThemeId`、界面筛选条件、少量最近选择可以考虑持久化

## 当前 `AppState` 建议替换的接口

- `addTheme` 改为 `createTheme`
- `deleteTheme` 改为 `removeTheme`
- `addDocument` 改为 `uploadDocument`、`createDocumentByUrl`、`createDocumentByText`
- `updateDocumentStatus` 改为 `refreshDocumentStatus`
- `addConversation` 改为 `createConversation`
- `addMessageToConversation` 改为 `appendMessage` 或内部私有更新函数
- `updateSettings` 改为 `saveSettings`

## 改造顺序建议

1. 先保留现有 state 字段名，先把 action 异步化
2. 接着把 Mock 初始数据替换成空数组和默认设置
3. 再补 `loadInitialData()`
4. 最后让页面把首次加载切到 store 的异步方法

## 容易出错的点

- 删除主题时，当前选中主题和当前会话必须同步清理
- 删除文档后，主题统计不要靠前端盲减，优先以后端返回的新列表或新统计为准
- 聊天消息流式更新时，不要每次 delta 都重建整个 conversations 列表
- `Math.max(...array)` 这种生成本地 ID 的逻辑要彻底移除

## 状态层原则

- 先调 API，再更新本地状态
- 乐观更新只用于低风险操作
- 删除主题时同步清理当前选中状态

## 完成标准

- 刷新页面后数据来自后端而不是硬编码
- 页面组件不再依赖 mock 数据存在
- store 的每个异步 action 都能给出加载态和失败态
