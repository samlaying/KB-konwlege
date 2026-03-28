export type EntityId = number | string;

export type DocumentStatus = 'pending' | 'indexing' | 'done' | 'failed';
export type MessageRole = 'user' | 'assistant';
export type LlmModel = 'deepseek' | 'qwen' | 'glm';
export type ThemeIcon =
  | '💼'
  | '🤖'
  | '🏃'
  | '💰'
  | '📚'
  | '🎨'
  | '🔬'
  | '🌍'
  | '🎵'
  | '🍕'
  | '✈️'
  | '💡'
  | string;

export interface Theme {
  id: number;
  name: string;
  icon: string;
  description: string;
  documentCount: number;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: number;
  themeId: number;
  filename: string;
  fileType: 'pdf' | 'docx' | 'md' | 'txt' | 'url';
  filePath: string;
  chunkCount: number;
  status: DocumentStatus;
  errorMessage?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Message {
  id: string;
  conversationId?: number;
  role: MessageRole;
  content: string;
  sources?: Source[];
  status?: 'streaming' | 'done' | 'failed';
  errorMessage?: string;
  timestamp: string;
}

export interface Source {
  documentId?: EntityId;
  documentName: string;
  pageNumber?: number;
  chunkIndex: number;
  snippet?: string;
}

export interface Conversation {
  id: number;
  themeId: number;
  title: string;
  messages: Message[];
  llmModel: LlmModel;
  messageCount?: number;
  lastMessageAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Settings {
  llmModel: LlmModel;
  embeddingModel: string;
  topK: number;
  temperature: number;
}

export interface ThemeDto {
  id: EntityId;
  name: string;
  icon: ThemeIcon;
  description: string;
  documentCount?: number;
  chunkCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentDto {
  id: EntityId;
  themeId: EntityId;
  filename: string;
  fileType: Document['fileType'];
  filePath: string;
  chunkCount?: number;
  status: DocumentStatus;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface MessageDto {
  id: EntityId;
  conversationId?: EntityId;
  role: MessageRole;
  content: string;
  sources?: Source[];
  timestamp: string;
}

export interface ConversationDto {
  id: EntityId;
  themeId: EntityId;
  title: string;
  messages?: MessageDto[];
  llmModel: LlmModel;
  messageCount?: number;
  lastMessageAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SettingsDto {
  llmModel: LlmModel;
  embeddingModel: string;
  topK: number;
  temperature: number;
}

export interface ApiErrorPayload {
  code?: string;
  message: string;
  details?: unknown;
}

export interface CreateThemePayload {
  name: string;
  icon: ThemeIcon;
  description: string;
}

export interface UpdateThemePayload extends Partial<CreateThemePayload> {}

export interface GetDocumentsParams {
  themeId?: EntityId;
}

export interface UploadDocumentPayload {
  themeId: EntityId;
  file: File;
}

export interface CreateDocumentByUrlPayload {
  themeId: EntityId;
  url: string;
  title?: string;
}

export interface CreateDocumentByTextPayload {
  themeId: EntityId;
  title: string;
  content: string;
}

export interface CreateConversationPayload {
  themeId: EntityId;
  title: string;
  llmModel: LlmModel;
}

export interface UpdateSettingsPayload extends Partial<SettingsDto> {}

export interface ChatRequestPayload {
  themeId: EntityId;
  question: string;
  conversationId?: EntityId;
  settings?: Partial<SettingsDto>;
}

export interface ChatStreamStartEvent {
  conversationId: EntityId;
  messageId: EntityId;
}

export interface ChatStreamDeltaEvent {
  delta: string;
}

export interface ChatStreamSourcesEvent {
  sources: Source[];
}

export interface ChatStreamDoneEvent {
  messageId: EntityId;
  finishedAt?: string;
}

export interface ChatStreamErrorEvent {
  message: string;
  code?: string;
}

export interface ChatStreamHandlers {
  onStart?: (event: ChatStreamStartEvent) => void;
  onDelta?: (event: ChatStreamDeltaEvent) => void;
  onSources?: (event: ChatStreamSourcesEvent) => void;
  onDone?: (event: ChatStreamDoneEvent) => void;
  onError?: (event: ChatStreamErrorEvent) => void;
}

export type UploadProgressHandler = (progress: number) => void;
