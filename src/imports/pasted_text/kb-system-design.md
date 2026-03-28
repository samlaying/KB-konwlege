# 多主题知识库问答系统 — 设计文档

## 概述

个人使用的类 ChatGPT 知识库问答系统，支持按主题（职场、AI、生活等）分类管理资料，基于 RAG 架构实现针对特定主题的智能问答。本地运行，国产模型驱动。

## 架构

经典 RAG 架构，前后端分离，本地部署。

```
用户提问 → 选主题 → Embedding 问题 → Chroma 检索相关片段 → 拼接 Prompt → LLM 生成回答 → SSE 流式返回
```

### 核心原则

- **主题隔离**：每个主题对应独立的 Chroma Collection，检索时只查对应主题
- **模型可切换**：LLM 抽象层统一接口，通过配置切换 DeepSeek/通义千问/智谱
- **持久化**：所有数据（向量、元数据、原始文档）本地持久化存储

## 前端设计

### 技术栈

| 类别 | 选型 |
|------|------|
| 框架 | React 18 + TypeScript |
| 构建 | Vite |
| UI 组件 | Ant Design 5 |
| 状态管理 | Zustand |
| 路由 | React Router 6 |
| Markdown 渲染 | react-markdown + 代码高亮 |
| HTTP | axios + EventSource (SSE) |

### 页面

整体布局：左侧导航 + 右侧内容区。

#### 1. 对话问答页（核心页面）

- 左侧：主题选择器，卡片式列表，显示主题名、文档数、段落数
- 右侧：聊天区，消息气泡式展示
- AI 回答附带引用来源（文档名 + 页码）
- 底部输入框 + 发送按钮
- 支持流式输出（SSE），实时显示生成内容

#### 2. 主题管理页

- 卡片式网格展示所有主题
- 每张卡片：图标、名称、文档数、段落数、最近更新时间
- 新建主题（名称 + 图标 + 描述）
- 编辑/删除主题

#### 3. 知识库管理页

- 顶部：三种导入方式按钮（上传文档 / 导入网页 / 添加文本）
- 文档列表：文件名、类型、索引状态（已索引/处理中/失败）
- 支持文档删除（同时清理向量库中的对应数据）

#### 4. 历史记录 & 设置页

- 对话历史列表：主题图标 + 对话标题 + 时间
- 点击可恢复历史对话
- 设置区域：LLM 模型选择、Embedding 模型、检索 Top-K 参数

## 后端设计

### 技术栈

| 类别 | 选型 |
|------|------|
| 框架 | FastAPI |
| ORM | SQLAlchemy |
| 向量数据库 | ChromaDB (持久化模式) |
| Embedding | bge-large-zh-v1.5 |
| 文本分块 | LangChain RecursiveCharacterTextSplitter |
| PDF 解析 | pdfplumber |
| Word 解析 | python-docx |
| Markdown 解析 | markdown |
| 网页抓取 | requests + BeautifulSoup4 |

### 项目结构

```
kb-backend/
├── main.py                  # FastAPI 入口，路由注册
├── config.py                # 配置管理 (模型、路径等)
├── requirements.txt
├── data/                    # 数据目录 (持久化)
│   ├── chroma_db/           # Chroma 向量库
│   ├── kb.sqlite            # SQLite 元数据库
│   └── uploads/             # 原始文档存储
└── app/
    ├── api/                 # API 路由层
    │   ├── chat.py          # 对话问答接口 (SSE 流式)
    │   ├── theme.py         # 主题 CRUD
    │   ├── document.py      # 文档上传/管理
    │   └── history.py       # 历史记录
    ├── services/            # 业务逻辑层
    │   ├── document_service.py  # 文档解析 + 分块
    │   ├── embedding_service.py # 向量化 (Embedding)
    │   ├── rag_service.py       # RAG 检索 + Prompt 拼接
    │   ├── llm_service.py       # LLM 抽象层
    │   └── chat_service.py      # 对话管理
    ├── models/              # 数据模型 (SQLAlchemy)
    │   ├── theme.py
    │   ├── document.py
    │   └── conversation.py
    └── core/                # 核心组件
        ├── database.py      # SQLite 连接管理
        └── vectorstore.py   # Chroma 封装
```

### 核心模块

#### 1. 文档解析服务 (document_service)

支持的格式及解析方式：
- PDF → pdfplumber（支持表格提取）
- Word → python-docx
- Markdown → markdown 库转纯文本
- TXT → 直接读取
- 网页 → requests + BeautifulSoup4 提取正文

#### 2. 文本分块服务

- 策略：递归字符分割 (RecursiveCharacterTextSplitter)
- 块大小：800 字符（约 400 中文 tokens）
- 重叠：100 字符
- 分块时保留元数据（来源文件名、页码、章节标题）

#### 3. 向量化服务 (embedding_service)

- 模型：bge-large-zh-v1.5（中文语义效果最好的开源 Embedding）
- 每个主题 → 独立 Chroma Collection
- 向量元数据：{ document_id, chunk_index, source_file, page_number }

#### 4. LLM 抽象层 (llm_service)

统一接口封装，支持通过配置切换：
- DeepSeek (deepseek-chat)
- 通义千问 (qwen-turbo)
- 智谱 GLM (glm-4)

接口设计：
```python
class BaseLLM(ABC):
    async def chat(self, messages: list[dict], stream: bool = False) -> AsyncGenerator[str, None]: ...

class DeepSeekLLM(BaseLLM): ...
class QwenLLM(BaseLLM): ...
class ZhipuLLM(BaseLLM): ...
```

#### 5. RAG 服务 (rag_service)

问答流程：
1. 接收用户问题和主题 ID
2. 用 Embedding 模型向量化问题
3. 在主题对应的 Chroma Collection 中检索 Top-K 最相关片段
4. 拼接 Prompt：系统指令 + 检索到的上下文 + 用户问题
5. 调用 LLM 生成回答（SSE 流式）
6. 返回回答 + 引用来源

#### 6. 对话管理服务 (chat_service)

- 保存完整对话记录到 SQLite
- 支持恢复历史对话（加载消息历史）
- 自动生成对话标题（取首条消息前 20 字）

### API 接口

```
# 对话
POST /api/chat              # 发起问答 (SSE 流式)
  Body: { theme_id, question, conversation_id? }
  Response: SSE stream

# 主题
GET  /api/themes            # 主题列表
POST /api/themes            # 创建主题
PUT  /api/themes/{id}       # 更新主题
DELETE /api/themes/{id}     # 删除主题

# 文档
POST /api/documents/upload  # 上传文档 (multipart)
  Body: { file, theme_id }
POST /api/documents/url     # 导入网页
  Body: { url, theme_id }
POST /api/documents/text    # 添加文本
  Body: { text, title, theme_id }
GET  /api/documents/{theme_id}  # 主题下的文档列表
DELETE /api/documents/{id}   # 删除文档

# 历史
GET  /api/history           # 对话历史列表
GET  /api/history/{id}      # 对话详情
DELETE /api/history/{id}    # 删除对话

# 设置
GET  /api/settings          # 获取设置
PUT  /api/settings          # 更新设置
```

## 数据模型

### SQLite 表结构

#### themes（主题表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| name | TEXT | 主题名称 |
| icon | TEXT | 图标 emoji |
| description | TEXT | 主题描述 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

#### documents（文档表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| theme_id | INTEGER FK | 关联主题 |
| filename | TEXT | 文件名 |
| file_type | TEXT | 文件类型 (pdf/docx/md/txt/url) |
| file_path | TEXT | 本地存储路径 |
| chunk_count | INTEGER | 分块数量 |
| status | TEXT | 状态 (pending/indexing/done/failed) |
| created_at | DATETIME | 创建时间 |

#### conversations（对话表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| theme_id | INTEGER FK | 关联主题 |
| title | TEXT | 对话标题 |
| messages | TEXT | 消息列表 (JSON) |
| llm_model | TEXT | 使用的模型 |
| created_at | DATETIME | 创建时间 |

### Chroma 向量存储

- 每个 theme 对应一个 Collection
- 向量维度：1024 (bge-large-zh-v1.5)
- 元数据：{ document_id, chunk_index, source_file, page_number }
- 持久化路径：data/chroma_db/

## 关键设计决策

1. **Chroma 作为向量库**：轻量、本地、Python 原生、支持持久化，完美适配个人项目
2. **bge-large-zh-v1.5 Embedding**：中文语义理解效果最好的开源模型，本地运行无需 API
3. **SSE 流式输出**：提升用户体验，回答逐字显示而非等待完整生成
4. **LLM 抽象层**：统一接口，后续扩展新模型只需新增一个实现类
5. **主题级 Collection 隔离**：避免跨主题污染，检索更精准
