import type {
  Theme,
  Document,
  Conversation,
  Settings,
} from '../app/types';

const now = new Date().toISOString();
const dayAgo = new Date(Date.now() - 86400000).toISOString();

export const mockThemes: Theme[] = [
  {
    id: 1,
    name: '产品知识库',
    icon: '📚',
    description: '产品相关文档和知识',
    documentCount: 3,
    chunkCount: 42,
    createdAt: dayAgo,
    updatedAt: now,
  },
  {
    id: 2,
    name: '技术文档',
    icon: '💡',
    description: '技术架构与开发文档',
    documentCount: 2,
    chunkCount: 28,
    createdAt: dayAgo,
    updatedAt: now,
  },
];

export const mockDocuments: Document[] = [
  {
    id: 1,
    themeId: 1,
    filename: '产品需求文档.pdf',
    fileType: 'pdf',
    filePath: '/uploads/requirements.pdf',
    chunkCount: 15,
    status: 'done',
    createdAt: dayAgo,
    updatedAt: now,
  },
  {
    id: 2,
    themeId: 1,
    filename: '用户手册.md',
    fileType: 'md',
    filePath: '/uploads/manual.md',
    chunkCount: 18,
    status: 'done',
    createdAt: dayAgo,
    updatedAt: now,
  },
  {
    id: 3,
    themeId: 1,
    filename: 'API接口说明.docx',
    fileType: 'docx',
    filePath: '/uploads/api-guide.docx',
    chunkCount: 9,
    status: 'done',
    createdAt: dayAgo,
    updatedAt: now,
  },
  {
    id: 4,
    themeId: 2,
    filename: '系统架构设计.pdf',
    fileType: 'pdf',
    filePath: '/uploads/architecture.pdf',
    chunkCount: 16,
    status: 'done',
    createdAt: dayAgo,
    updatedAt: now,
  },
  {
    id: 5,
    themeId: 2,
    filename: '部署指南.txt',
    fileType: 'txt',
    filePath: '/uploads/deploy.txt',
    chunkCount: 12,
    status: 'done',
    createdAt: dayAgo,
    updatedAt: now,
  },
];

export const mockConversations: Conversation[] = [
  {
    id: 1,
    themeId: 1,
    title: '如何使用产品API？',
    messages: [
      {
        id: '1',
        conversationId: 1,
        role: 'user',
        content: '如何使用产品API？',
        timestamp: dayAgo,
      },
      {
        id: '2',
        conversationId: 1,
        role: 'assistant',
        content: '产品API的使用方式如下：\n\n1. 首先获取API密钥\n2. 按照接口文档发送请求\n3. 处理返回结果\n\n具体细节请参考API接口说明文档。',
        sources: [
          {
            documentId: 3,
            documentName: 'API接口说明.docx',
            chunkIndex: 2,
            snippet: 'API认证方式采用Bearer Token...',
          },
        ],
        timestamp: dayAgo,
      },
    ],
    llmModel: 'deepseek',
    messageCount: 2,
    lastMessageAt: dayAgo,
    createdAt: dayAgo,
    updatedAt: dayAgo,
  },
];

export const mockSettings: Settings = {
  llmModel: 'deepseek',
  embeddingModel: 'bge-large-zh-v1.5',
  topK: 5,
  temperature: 0.7,
};
