# 后端接入步骤

基于 [`F:\samlay\KB-konwlege\后端接入分析.txt`](F:\samlay\KB-konwlege\后端接入分析.txt) 拆分的前端接入后端实施文档。

## 文档索引

1. [`01-统一接口契约.md`](F:\samlay\KB-konwlege\guidelines\后端接入步骤\01-统一接口契约.md)
2. [`02-开发代理与环境变量.md`](F:\samlay\KB-konwlege\guidelines\后端接入步骤\02-开发代理与环境变量.md)
3. [`03-建立统一API层.md`](F:\samlay\KB-konwlege\guidelines\后端接入步骤\03-建立统一API层.md)
4. [`04-改造Zustand数据层.md`](F:\samlay\KB-konwlege\guidelines\后端接入步骤\04-改造Zustand数据层.md)
5. [`05-接入主题和设置模块.md`](F:\samlay\KB-konwlege\guidelines\后端接入步骤\05-接入主题和设置模块.md)
6. [`06-接入文档上传和索引状态.md`](F:\samlay\KB-konwlege\guidelines\后端接入步骤\06-接入文档上传和索引状态.md)
7. [`07-接入真实对话和SSE问答.md`](F:\samlay\KB-konwlege\guidelines\后端接入步骤\07-接入真实对话和SSE问答.md)
8. [`08-补齐历史记录错误处理和验收.md`](F:\samlay\KB-konwlege\guidelines\后端接入步骤\08-补齐历史记录错误处理和验收.md)
9. [`99-实施顺序与改造文件清单.md`](F:\samlay\KB-konwlege\guidelines\后端接入步骤\99-实施顺序与改造文件清单.md)

## 当前项目现状

- [`F:\samlay\KB-konwlege\src\app\services\api.ts`](F:\samlay\KB-konwlege\src\app\services\api.ts) 还是空文件，尚未建立请求层
- [`F:\samlay\KB-konwlege\src\app\store\index.ts`](F:\samlay\KB-konwlege\src\app\store\index.ts) 仍然完全依赖 `mockThemes`、`mockDocuments`、`mockConversations`
- [`F:\samlay\KB-konwlege\src\app\pages\ChatPage.tsx`](F:\samlay\KB-konwlege\src\app\pages\ChatPage.tsx) 通过 `simulateStreamingResponse()` 生成假回答
- [`F:\samlay\KB-konwlege\src\app\pages\DocumentsPage.tsx`](F:\samlay\KB-konwlege\src\app\pages\DocumentsPage.tsx) 只是在前端构造文档并用 `setTimeout` 模拟索引
- [`F:\samlay\KB-konwlege\src\app\types\index.ts`](F:\samlay\KB-konwlege\src\app\types\index.ts) 已经有基础类型，但还没有和后端 DTO 明确对齐

## 使用方式

- 按编号顺序推进，不要并行大改所有页面
- 每完成一个文件中的完成标准，再进入下一步
- 代码改造优先围绕 `src/app/services`、`src/app/store` 和 `src/app/pages`
- 每一步都先补类型和 API，再改页面，不要让页面自己拼请求
