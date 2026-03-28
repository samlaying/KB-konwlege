# 步骤 3：建立统一 API 层

目标：把零散请求能力集中到 `src/app/services/api.ts`，为页面和 store 提供稳定调用入口。

## 当前代码现状

- [`F:\samlay\KB-konwlege\src\app\services\api.ts`](F:\samlay\KB-konwlege\src\app\services\api.ts) 为空
- 当前所有页面都直接依赖 Zustand 内存数据，没有请求封装层
- 这一层建立完成后，后续页面改造和 store 改造才能真正开始

## 建议拆分

- `apiClient`：axios 实例
- `themeApi`
- `documentApi`
- `conversationApi`
- `settingsApi`
- `chatApi`

## API 层要具备的能力

- `baseURL`
- 请求拦截器
- 响应拦截器
- 统一错误处理
- 上传进度回调
- SSE 聊天封装

## 建议输出函数

- `getThemes()`
- `createTheme(payload)`
- `uploadDocument(formData, onProgress)`
- `createConversation(payload)`
- `streamChat(payload, handlers)`
- `getSettings()`

## 建议文件结构

- `src/app/services/api.ts`
- 如果单文件太长，再拆成：
- `src/app/services/api/client.ts`
- `src/app/services/api/theme.ts`
- `src/app/services/api/document.ts`
- `src/app/services/api/conversation.ts`
- `src/app/services/api/settings.ts`
- `src/app/services/api/chat.ts`

## 建议最少暴露的方法

- `themeApi.getThemes()`
- `themeApi.createTheme(payload)`
- `themeApi.updateTheme(id, payload)`
- `themeApi.deleteTheme(id)`
- `documentApi.getDocuments(params?)`
- `documentApi.uploadDocument(formData, onProgress?)`
- `documentApi.createDocumentByUrl(payload)`
- `documentApi.createDocumentByText(payload)`
- `documentApi.getDocumentStatus(id)`
- `documentApi.deleteDocument(id)`
- `conversationApi.getConversations(params?)`
- `conversationApi.getConversation(id)`
- `conversationApi.createConversation(payload)`
- `conversationApi.deleteConversation(id)`
- `settingsApi.getSettings()`
- `settingsApi.updateSettings(payload)`
- `chatApi.streamChat(payload, handlers)`

## 错误处理建议

- axios 错误统一转换成前端可展示的 `Error` 或 `AppError`
- API 层只负责抛出结构化错误，不直接弹 message
- 页面和 store 决定错误提示位置，避免重复弹窗

## SSE 封装建议

- 不要把 `EventSource` 直接散落在 [`F:\samlay\KB-konwlege\src\app\pages\ChatPage.tsx`](F:\samlay\KB-konwlege\src\app\pages\ChatPage.tsx)
- 在 API 层封装 `streamChat(payload, handlers)`，对外提供：
- `onStart`
- `onDelta`
- `onSources`
- `onDone`
- `onError`
- `abort()`

## 这一阶段建议同步补的类型

- `ApiListParams`
- `UploadProgressHandler`
- `ChatStreamHandlers`
- `CreateThemePayload`
- `CreateDocumentByUrlPayload`
- `CreateDocumentByTextPayload`
- `ChatRequestPayload`

## 完成标准

- 页面和 store 不再直接拼接口地址
- 所有请求都经由统一 API 层发起
- API 层可以独立被 store 调用，不依赖 React 组件上下文
