import axios, { AxiosError, type AxiosInstance } from 'axios';
import type {
  ApiErrorPayload,
  ChatRequestPayload,
  ChatStreamDoneEvent,
  ChatStreamErrorEvent,
  ChatStreamHandlers,
  ChatStreamSourcesEvent,
  ChatStreamStartEvent,
  Conversation,
  ConversationDto,
  CreateConversationPayload,
  CreateDocumentByTextPayload,
  CreateDocumentByUrlPayload,
  CreateThemePayload,
  Document,
  DocumentDto,
  EntityId,
  GetDocumentsParams,
  Message,
  MessageDto,
  Settings,
  SettingsDto,
  Theme,
  ThemeDto,
  UpdateSettingsPayload,
  UpdateThemePayload,
  UploadDocumentPayload,
  UploadProgressHandler,
} from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api';
const SSE_BASE_URL = (import.meta.env.VITE_SSE_BASE_URL as string | undefined) || API_BASE_URL;
const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 30000);

export class ApiError extends Error {
  code?: string;
  status?: number;
  details?: unknown;

  constructor(message: string, options?: { code?: string; status?: number; details?: unknown }) {
    super(message);
    this.name = 'ApiError';
    this.code = options?.code;
    this.status = options?.status;
    this.details = options?.details;
  }
}

function toNumberId(id: EntityId): number {
  return typeof id === 'number' ? id : Number(id);
}

function toMessage(message: MessageDto): Message {
  return {
    id: String(message.id),
    conversationId:
      message.conversationId !== undefined ? toNumberId(message.conversationId) : undefined,
    role: message.role,
    content: message.content,
    sources: message.sources,
    timestamp: message.timestamp,
  };
}

function toTheme(theme: ThemeDto): Theme {
  return {
    id: toNumberId(theme.id),
    name: theme.name,
    icon: theme.icon,
    description: theme.description,
    documentCount: theme.documentCount ?? 0,
    chunkCount: theme.chunkCount ?? 0,
    createdAt: theme.createdAt,
    updatedAt: theme.updatedAt,
  };
}

function toDocument(document: DocumentDto): Document {
  return {
    id: toNumberId(document.id),
    themeId: toNumberId(document.themeId),
    filename: document.filename,
    fileType: document.fileType,
    filePath: document.filePath,
    chunkCount: document.chunkCount ?? 0,
    status: document.status,
    errorMessage: document.errorMessage ?? undefined,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

function toConversation(conversation: ConversationDto): Conversation {
  return {
    id: toNumberId(conversation.id),
    themeId: toNumberId(conversation.themeId),
    title: conversation.title,
    messages: (conversation.messages ?? []).map(toMessage),
    llmModel: conversation.llmModel,
    messageCount: conversation.messageCount,
    lastMessageAt: conversation.lastMessageAt,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
}

function toSettings(settings: SettingsDto): Settings {
  return {
    llmModel: settings.llmModel,
    embeddingModel: settings.embeddingModel,
    topK: settings.topK,
    temperature: settings.temperature,
  };
}

function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorPayload>;
    const status = axiosError.response?.status;
    const payload = axiosError.response?.data;
    return new ApiError(payload?.message || axiosError.message || 'Request failed', {
      code: payload?.code,
      status,
      details: payload?.details,
    });
  }

  if (error instanceof Error) {
    return new ApiError(error.message);
  }

  return new ApiError('Unknown request error');
}

function joinUrl(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

function parseSseEventData<T>(event: MessageEvent<string>): T | null {
  if (!event.data) {
    return null;
  }

  try {
    return JSON.parse(event.data) as T;
  } catch {
    return null;
  }
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(normalizeApiError(error))
);

export const themeApi = {
  async getThemes(): Promise<Theme[]> {
    const response = await apiClient.get<ThemeDto[]>('/themes');
    return response.data.map(toTheme);
  },

  async createTheme(payload: CreateThemePayload): Promise<Theme> {
    const response = await apiClient.post<ThemeDto>('/themes', payload);
    return toTheme(response.data);
  },

  async updateTheme(id: EntityId, payload: UpdateThemePayload): Promise<Theme> {
    const response = await apiClient.put<ThemeDto>(`/themes/${id}`, payload);
    return toTheme(response.data);
  },

  async deleteTheme(id: EntityId): Promise<void> {
    await apiClient.delete(`/themes/${id}`);
  },
};

export const documentApi = {
  async getDocuments(params?: GetDocumentsParams): Promise<Document[]> {
    const response = await apiClient.get<DocumentDto[]>('/documents', { params });
    return response.data.map(toDocument);
  },

  async uploadDocument(
    payload: UploadDocumentPayload,
    onProgress?: UploadProgressHandler
  ): Promise<Document> {
    const formData = new FormData();
    formData.append('themeId', String(payload.themeId));
    formData.append('file', payload.file);

    const response = await apiClient.post<DocumentDto>('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (event) => {
        if (!onProgress || !event.total) {
          return;
        }

        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      },
    });

    return toDocument(response.data);
  },

  async createDocumentByUrl(payload: CreateDocumentByUrlPayload): Promise<Document> {
    const response = await apiClient.post<DocumentDto>('/documents/url', payload);
    return toDocument(response.data);
  },

  async createDocumentByText(payload: CreateDocumentByTextPayload): Promise<Document> {
    const response = await apiClient.post<DocumentDto>('/documents/text', payload);
    return toDocument(response.data);
  },

  async getDocumentStatus(id: EntityId): Promise<Document> {
    const response = await apiClient.get<DocumentDto>(`/documents/${id}/status`);
    return toDocument(response.data);
  },

  async deleteDocument(id: EntityId): Promise<void> {
    await apiClient.delete(`/documents/${id}`);
  },
};

export const conversationApi = {
  async getConversations(): Promise<Conversation[]> {
    const response = await apiClient.get<ConversationDto[]>('/conversations');
    return response.data.map(toConversation);
  },

  async getConversation(id: EntityId): Promise<Conversation> {
    const response = await apiClient.get<ConversationDto>(`/conversations/${id}`);
    return toConversation(response.data);
  },

  async createConversation(payload: CreateConversationPayload): Promise<Conversation> {
    const response = await apiClient.post<ConversationDto>('/conversations', payload);
    return toConversation(response.data);
  },

  async deleteConversation(id: EntityId): Promise<void> {
    await apiClient.delete(`/conversations/${id}`);
  },
};

export const settingsApi = {
  async getSettings(): Promise<Settings> {
    const response = await apiClient.get<SettingsDto>('/settings');
    return toSettings(response.data);
  },

  async updateSettings(payload: UpdateSettingsPayload): Promise<Settings> {
    const response = await apiClient.put<SettingsDto>('/settings', payload);
    return toSettings(response.data);
  },
};

export const chatApi = {
  streamChat(payload: ChatRequestPayload, handlers: ChatStreamHandlers = {}) {
    const url = new URL(joinUrl(SSE_BASE_URL, '/chat'), window.location.origin);
    url.searchParams.set('themeId', String(payload.themeId));
    url.searchParams.set('question', payload.question);

    if (payload.conversationId !== undefined) {
      url.searchParams.set('conversationId', String(payload.conversationId));
    }

    if (payload.settings) {
      url.searchParams.set('settings', JSON.stringify(payload.settings));
    }

    const source = new EventSource(url.toString());

    source.addEventListener('start', (event) => {
      const data = parseSseEventData<ChatStreamStartEvent>(event as MessageEvent<string>);
      if (data) {
        handlers.onStart?.(data);
      }
    });

    source.addEventListener('delta', (event) => {
      const data = parseSseEventData<{ delta: string }>(event as MessageEvent<string>);
      if (data) {
        handlers.onDelta?.(data);
      }
    });

    source.addEventListener('sources', (event) => {
      const data = parseSseEventData<ChatStreamSourcesEvent>(event as MessageEvent<string>);
      if (data) {
        handlers.onSources?.(data);
      }
    });

    source.addEventListener('done', (event) => {
      const data =
        parseSseEventData<ChatStreamDoneEvent>(event as MessageEvent<string>) || {
          messageId: '',
        };
      handlers.onDone?.(data);
      source.close();
    });

    source.addEventListener('error', (event) => {
      const data =
        parseSseEventData<ChatStreamErrorEvent>(event as MessageEvent<string>) || {
          message: 'SSE connection failed',
        };
      handlers.onError?.(data);
      source.close();
    });

    source.onerror = () => {
      handlers.onError?.({ message: 'SSE connection interrupted' });
      source.close();
    };

    return {
      abort() {
        source.close();
      },
    };
  },
};

export const api = {
  theme: themeApi,
  document: documentApi,
  conversation: conversationApi,
  settings: settingsApi,
  chat: chatApi,
};

export { API_BASE_URL, SSE_BASE_URL, normalizeApiError };
