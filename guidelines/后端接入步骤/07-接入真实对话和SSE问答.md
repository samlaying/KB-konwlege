# 步骤 7：接入真实对话和 SSE 问答

目标：替换 `ChatPage.tsx` 里的假回复逻辑，接入真实 RAG 问答。

## 涉及页面

- `src/app/pages/ChatPage.tsx`

## 当前代码现状

- [`F:\samlay\KB-konwlege\src\app\pages\ChatPage.tsx`](F:\samlay\KB-konwlege\src\app\pages\ChatPage.tsx) 的核心流程还是：
- 用户消息先写入本地 store
- `simulateStreamingResponse()` 返回一大段固定 Markdown
- 最后再把 assistant 消息一次性追加到会话
- 当前并没有真正的逐段流式更新，也没有真实来源数据

## 这一页需要保留和需要替换的部分

- 主题选择 UI 可以保留
- Markdown 渲染可以保留
- “新建对话”按钮逻辑可以保留，但要改成清理当前会话状态，而不是只清本地对象
- `simulateStreamingResponse()` 必须删除
- `handleSend()` 必须切到真实请求和流式消息更新

## 建议的发送流程

1. 校验 `selectedThemeId` 和输入内容
2. 先把用户消息写入当前会话草稿或真实会话
3. 如果没有 `currentConversation`，先创建对话，或者等待 `/api/chat` 回传 `conversationId`
4. 创建一个空的 assistant 消息占位
5. 订阅 `delta` 事件持续追加文本
6. 收到 `sources` 后更新 assistant 消息引用
7. 收到 `done` 后结束 loading
8. 收到 `error` 后把消息标记为失败或展示错误提示

## 建议的前端状态设计

- `isSending`
- `streamingMessageId`
- `streamError`
- `abortCurrentStream`

## SSE 事件到 UI 的映射

- `start`：确认会话 ID，必要时刷新当前会话
- `delta`：更新 assistant 消息内容
- `sources`：写入 `message.sources`
- `done`：结束加载态
- `error`：停止流并展示重试入口

## 当前页面需要特别注意的点

- 现在通过 `Math.max(...conversations)` 推导新会话 ID，这部分接入后端后必须删除
- 当前发送后会重新从 `useAppStore.getState()` 取最后一个会话，这种写法在异步场景下容易拿错数据
- 现在的 `isLoading` 只是本地假加载，接真实 SSE 后要和真正的流状态绑定
- 来源信息不应继续写在 Markdown 文本里，而应走 `message.sources`

## 核心改造

- 删除 `simulateStreamingResponse()`
- 首次提问前先创建对话，或由 `/api/chat` 自动创建并返回 `conversationId`
- 发送问题时携带：
  - `themeId`
  - `question`
  - `conversationId`
  - `settings`
- 使用 SSE 按增量更新 assistant 消息内容
- 最终把 `sources` 引用信息渲染到消息卡片中

## 建议的流式事件

- `start`
- `delta`
- `sources`
- `done`
- `error`

## 完成标准

- 用户发送问题后能看到逐步生成的回答
- 刷新后历史对话可以重新加载
- 回答能展示引用来源
- SSE 中断或报错时，用户能看到明确提示并继续下一次提问
