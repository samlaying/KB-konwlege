import { create } from 'zustand';
import {
  conversationApi,
  documentApi,
  normalizeApiError,
  settingsApi,
  themeApi,
} from '../services/api';
import type {
  Conversation,
  CreateDocumentByTextPayload,
  CreateDocumentByUrlPayload,
  CreateThemePayload,
  Document,
  Message,
  Settings,
  Theme,
  UpdateThemePayload,
  UploadDocumentPayload,
} from '../types';

const defaultSettings: Settings = {
  llmModel: 'deepseek',
  embeddingModel: 'bge-large-zh-v1.5',
  topK: 5,
  temperature: 0.7,
};

interface AppState {
  isBootstrapping: boolean;
  bootstrapped: boolean;
  themeLoading: boolean;
  documentLoading: boolean;
  conversationLoading: boolean;
  settingsLoading: boolean;
  lastError: string | null;

  themes: Theme[];
  selectedThemeId: number | null;
  documents: Document[];
  conversations: Conversation[];
  currentConversation: Conversation | null;
  settings: Settings;

  loadInitialData: () => Promise<void>;
  loadThemes: () => Promise<void>;
  loadDocuments: (themeId?: number) => Promise<void>;
  loadConversations: () => Promise<void>;
  loadConversationDetail: (id: number) => Promise<Conversation | null>;
  loadSettings: () => Promise<void>;

  createTheme: (payload: CreateThemePayload) => Promise<Theme | null>;
  saveTheme: (id: number, payload: UpdateThemePayload) => Promise<Theme | null>;
  removeTheme: (id: number) => Promise<boolean>;
  saveSettings: (payload?: Partial<Settings>) => Promise<Settings | null>;

  addTheme: (theme: Omit<Theme, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTheme: (id: number, theme: Partial<Theme>) => Promise<void>;
  deleteTheme: (id: number) => Promise<void>;
  selectTheme: (id: number | null) => void;

  addDocument: (doc: Omit<Document, 'id' | 'createdAt'>) => Promise<void>;
  uploadDocumentFile: (
    payload: UploadDocumentPayload,
    onProgress?: (progress: number) => void
  ) => Promise<Document | null>;
  createDocumentByUrl: (payload: CreateDocumentByUrlPayload) => Promise<Document | null>;
  createDocumentByText: (payload: CreateDocumentByTextPayload) => Promise<Document | null>;
  deleteDocument: (id: number) => Promise<void>;
  updateDocumentStatus: (id: number, status: Document['status']) => Promise<void>;
  refreshDocumentStatus: (id: number) => Promise<Document | null>;

  addConversation: (conversation: Omit<Conversation, 'id'>) => Promise<void>;
  createConversation: (conversation: Omit<Conversation, 'id'>) => Promise<Conversation | null>;
  deleteConversation: (id: number) => Promise<void>;
  setCurrentConversation: (conversation: Conversation | null) => void;
  addMessageToConversation: (conversationId: number, message: Message) => void;
  upsertConversationState: (conversation: Conversation) => void;
  upsertMessageInConversation: (conversationId: number, message: Message) => void;
  updateSettings: (settings: Partial<Settings>) => void;
}

function upsertConversation(
  conversations: Conversation[],
  conversation: Conversation,
  matchId?: number
) {
  const index = conversations.findIndex((item) => item.id === (matchId ?? conversation.id));
  if (index === -1) {
    return [...conversations, conversation];
  }

  const next = [...conversations];
  next[index] = conversation;
  return next;
}

function upsertDocument(documents: Document[], document: Document, matchId?: number) {
  const index = documents.findIndex((item) => item.id === (matchId ?? document.id));
  if (index === -1) {
    return [...documents, document];
  }

  const next = [...documents];
  next[index] = document;
  return next;
}

function syncCurrentConversation(
  currentConversation: Conversation | null,
  conversation: Conversation,
  matchId?: number
) {
  if (!currentConversation) {
    return currentConversation;
  }

  const currentId = matchId ?? conversation.id;
  return currentConversation.id === currentId ? conversation : currentConversation;
}

export const useAppStore = create<AppState>((set, get) => ({
  isBootstrapping: false,
  bootstrapped: false,
  themeLoading: false,
  documentLoading: false,
  conversationLoading: false,
  settingsLoading: false,
  lastError: null,

  themes: [],
  selectedThemeId: null,
  documents: [],
  conversations: [],
  currentConversation: null,
  settings: defaultSettings,

  async loadInitialData() {
    if (get().isBootstrapping) {
      return;
    }

    set({
      isBootstrapping: true,
      lastError: null,
      themeLoading: true,
      documentLoading: true,
      conversationLoading: true,
      settingsLoading: true,
    });

    const [themesResult, documentsResult, conversationsResult, settingsResult] =
      await Promise.allSettled([
        themeApi.getThemes(),
        documentApi.getDocuments(),
        conversationApi.getConversations(),
        settingsApi.getSettings(),
      ]);

    let lastError: string | null = null;

    set((state) => ({
      isBootstrapping: false,
      bootstrapped: true,
      themeLoading: false,
      documentLoading: false,
      conversationLoading: false,
      settingsLoading: false,
      lastError: state.lastError,
      themes: themesResult.status === 'fulfilled' ? themesResult.value : state.themes,
      documents: documentsResult.status === 'fulfilled' ? documentsResult.value : state.documents,
      conversations:
        conversationsResult.status === 'fulfilled'
          ? conversationsResult.value
          : state.conversations,
      settings: settingsResult.status === 'fulfilled' ? settingsResult.value : state.settings,
    }));

    if (themesResult.status === 'rejected') {
      lastError = normalizeApiError(themesResult.reason).message;
    } else if (documentsResult.status === 'rejected') {
      lastError = normalizeApiError(documentsResult.reason).message;
    } else if (conversationsResult.status === 'rejected') {
      lastError = normalizeApiError(conversationsResult.reason).message;
    } else if (settingsResult.status === 'rejected') {
      lastError = normalizeApiError(settingsResult.reason).message;
    }

    if (lastError) {
      set({ lastError });
    }
  },

  async loadThemes() {
    set({ themeLoading: true, lastError: null });
    try {
      const themes = await themeApi.getThemes();
      set({ themes, themeLoading: false });
    } catch (error) {
      set({ themeLoading: false, lastError: normalizeApiError(error).message });
    }
  },

  async loadDocuments(themeId) {
    set({ documentLoading: true, lastError: null });
    try {
      const documents = await documentApi.getDocuments(themeId ? { themeId } : undefined);
      set({ documents, documentLoading: false });
    } catch (error) {
      set({ documentLoading: false, lastError: normalizeApiError(error).message });
    }
  },

  async loadConversations() {
    set({ conversationLoading: true, lastError: null });
    try {
      const conversations = await conversationApi.getConversations();
      set({ conversations, conversationLoading: false });
    } catch (error) {
      set({ conversationLoading: false, lastError: normalizeApiError(error).message });
    }
  },

  async loadConversationDetail(id) {
    set({ conversationLoading: true, lastError: null });
    try {
      const conversation = await conversationApi.getConversation(id);
      set((state) => ({
        conversationLoading: false,
        conversations: upsertConversation(state.conversations, conversation),
        currentConversation:
          state.currentConversation?.id === id ? conversation : state.currentConversation,
      }));
      return conversation;
    } catch (error) {
      set({ conversationLoading: false, lastError: normalizeApiError(error).message });
      return null;
    }
  },

  async loadSettings() {
    set({ settingsLoading: true, lastError: null });
    try {
      const settings = await settingsApi.getSettings();
      set({ settings, settingsLoading: false });
    } catch (error) {
      set({ settingsLoading: false, lastError: normalizeApiError(error).message });
    }
  },

  async createTheme(payload) {
    set({ themeLoading: true, lastError: null });
    try {
      const theme = await themeApi.createTheme(payload);
      set((state) => ({
        themes: [...state.themes, theme],
        themeLoading: false,
      }));
      return theme;
    } catch (error) {
      set({ themeLoading: false, lastError: normalizeApiError(error).message });
      return null;
    }
  },

  async saveTheme(id, payload) {
    set({ themeLoading: true, lastError: null });
    try {
      const theme = await themeApi.updateTheme(id, payload);
      set((state) => ({
        themes: state.themes.map((item) => (item.id === id ? theme : item)),
        themeLoading: false,
      }));
      return theme;
    } catch (error) {
      set({ themeLoading: false, lastError: normalizeApiError(error).message });
      return null;
    }
  },

  async removeTheme(id) {
    set({ themeLoading: true, lastError: null });
    try {
      await themeApi.deleteTheme(id);
      set((state) => ({
        themes: state.themes.filter((theme) => theme.id !== id),
        documents: state.documents.filter((document) => document.themeId !== id),
        conversations: state.conversations.filter((conversation) => conversation.themeId !== id),
        currentConversation:
          state.currentConversation?.themeId === id ? null : state.currentConversation,
        selectedThemeId: state.selectedThemeId === id ? null : state.selectedThemeId,
        themeLoading: false,
      }));
      return true;
    } catch (error) {
      set({ themeLoading: false, lastError: normalizeApiError(error).message });
      return false;
    }
  },

  async saveSettings(payload) {
    set({ settingsLoading: true, lastError: null });
    try {
      const nextPayload = payload ?? get().settings;
      const settings = await settingsApi.updateSettings(nextPayload);
      set({ settings, settingsLoading: false });
      return settings;
    } catch (error) {
      set({ settingsLoading: false, lastError: normalizeApiError(error).message });
      return null;
    }
  },

  async addTheme(theme) {
    await get().createTheme({
      name: theme.name,
      icon: theme.icon,
      description: theme.description,
    });
  },

  async updateTheme(id, theme) {
    await get().saveTheme(id, {
      name: theme.name,
      icon: theme.icon,
      description: theme.description,
    });
  },

  async deleteTheme(id) {
    await get().removeTheme(id);
  },

  selectTheme(id) {
    set({ selectedThemeId: id });
  },

  async addDocument(doc) {
    const tempId = Date.now();
    const optimisticDocument: Document = {
      ...doc,
      id: tempId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set((state) => ({
      documents: [...state.documents, optimisticDocument],
      themes: state.themes.map((theme) =>
        theme.id === doc.themeId
          ? {
              ...theme,
              documentCount: theme.documentCount + 1,
              chunkCount: theme.chunkCount + doc.chunkCount,
              updatedAt: new Date().toISOString(),
            }
          : theme
      ),
    }));
  },

  async uploadDocumentFile(payload, onProgress) {
    set({ documentLoading: true, lastError: null });
    try {
      const document = await documentApi.uploadDocument(payload, onProgress);
      set((state) => ({
        documents: upsertDocument(state.documents, document),
        documentLoading: false,
      }));
      await get().loadThemes();
      return document;
    } catch (error) {
      set({ documentLoading: false, lastError: normalizeApiError(error).message });
      return null;
    }
  },

  async createDocumentByUrl(payload) {
    set({ documentLoading: true, lastError: null });
    try {
      const document = await documentApi.createDocumentByUrl(payload);
      set((state) => ({
        documents: upsertDocument(state.documents, document),
        documentLoading: false,
      }));
      await get().loadThemes();
      return document;
    } catch (error) {
      set({ documentLoading: false, lastError: normalizeApiError(error).message });
      return null;
    }
  },

  async createDocumentByText(payload) {
    set({ documentLoading: true, lastError: null });
    try {
      const document = await documentApi.createDocumentByText(payload);
      set((state) => ({
        documents: upsertDocument(state.documents, document),
        documentLoading: false,
      }));
      await get().loadThemes();
      return document;
    } catch (error) {
      set({ documentLoading: false, lastError: normalizeApiError(error).message });
      return null;
    }
  },

  async deleteDocument(id) {
    const target = get().documents.find((document) => document.id === id);

    set((state) => ({
      documents: state.documents.filter((document) => document.id !== id),
      themes: target
        ? state.themes.map((theme) =>
            theme.id === target.themeId
              ? {
                  ...theme,
                  documentCount: Math.max(0, theme.documentCount - 1),
                  chunkCount: Math.max(0, theme.chunkCount - target.chunkCount),
                  updatedAt: new Date().toISOString(),
                }
              : theme
          )
        : state.themes,
    }));

    try {
      await documentApi.deleteDocument(id);
      await get().loadThemes();
      await get().loadDocuments(get().selectedThemeId ?? undefined);
    } catch (error) {
      set({ lastError: normalizeApiError(error).message });
      await get().loadThemes();
      await get().loadDocuments(get().selectedThemeId ?? undefined);
    }
  },

  async updateDocumentStatus(id, status) {
    set((state) => ({
      documents: state.documents.map((document) =>
        document.id === id ? { ...document, status } : document
      ),
    }));
  },

  async refreshDocumentStatus(id) {
    try {
      const document = await documentApi.getDocumentStatus(id);
      set((state) => ({
        documents: upsertDocument(state.documents, document),
      }));

      if (document.status === 'done' || document.status === 'failed') {
        await get().loadThemes();
      }

      return document;
    } catch (error) {
      set({ lastError: normalizeApiError(error).message });
      return null;
    }
  },

  async addConversation(conversation) {
    await get().createConversation(conversation);
  },

  async createConversation(conversation) {
    set({ conversationLoading: true, lastError: null });
    try {
      const savedConversation = await conversationApi.createConversation({
        themeId: conversation.themeId,
        title: conversation.title,
        llmModel: conversation.llmModel,
      });
      const nextConversation: Conversation = {
        ...savedConversation,
        messages:
          savedConversation.messages.length > 0 ? savedConversation.messages : conversation.messages,
        updatedAt: savedConversation.updatedAt ?? conversation.createdAt,
        messageCount:
          savedConversation.messageCount ?? savedConversation.messages.length ?? conversation.messages.length,
        lastMessageAt:
          savedConversation.lastMessageAt ??
          savedConversation.messages[savedConversation.messages.length - 1]?.timestamp ??
          conversation.messages[conversation.messages.length - 1]?.timestamp,
      };

      set((state) => ({
        conversationLoading: false,
        conversations: upsertConversation(state.conversations, nextConversation),
        currentConversation: nextConversation,
      }));

      return nextConversation;
    } catch (error) {
      set({
        conversationLoading: false,
        lastError: normalizeApiError(error).message,
      });
      return null;
    }
  },

  async deleteConversation(id) {
    const previousState = get();

    set((state) => ({
      conversations: state.conversations.filter((conversation) => conversation.id !== id),
      currentConversation:
        state.currentConversation?.id === id ? null : state.currentConversation,
    }));

    try {
      await conversationApi.deleteConversation(id);
    } catch (error) {
      set({
        conversations: previousState.conversations,
        currentConversation: previousState.currentConversation,
        lastError: normalizeApiError(error).message,
      });
    }
  },

  setCurrentConversation(conversation) {
    set({ currentConversation: conversation });
  },

  addMessageToConversation(conversationId, message) {
    set((state) => ({
      conversations: state.conversations.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              messages: [...conversation.messages, message],
              messageCount: (conversation.messageCount ?? conversation.messages.length) + 1,
              lastMessageAt: message.timestamp,
            }
          : conversation
      ),
      currentConversation:
        state.currentConversation?.id === conversationId
          ? {
              ...state.currentConversation,
              messages: [...state.currentConversation.messages, message],
              messageCount:
                (state.currentConversation.messageCount ??
                  state.currentConversation.messages.length) + 1,
              lastMessageAt: message.timestamp,
            }
          : state.currentConversation,
    }));
  },

  upsertConversationState(conversation) {
    set((state) => ({
      conversations: upsertConversation(state.conversations, conversation),
      currentConversation:
        state.currentConversation?.id === conversation.id
          ? conversation
          : state.currentConversation,
    }));
  },

  upsertMessageInConversation(conversationId, message) {
    set((state) => ({
      conversations: state.conversations.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              messages: (() => {
                const existingIndex = conversation.messages.findIndex((item) => item.id === message.id);
                if (existingIndex === -1) {
                  return [...conversation.messages, message];
                }
                const nextMessages = [...conversation.messages];
                nextMessages[existingIndex] = message;
                return nextMessages;
              })(),
              messageCount: Math.max(
                conversation.messageCount ?? conversation.messages.length,
                conversation.messages.some((item) => item.id === message.id)
                  ? conversation.messages.length
                  : conversation.messages.length + 1
              ),
              lastMessageAt: message.timestamp,
            }
          : conversation
      ),
      currentConversation:
        state.currentConversation?.id === conversationId
          ? {
              ...state.currentConversation,
              messages: (() => {
                const existingIndex = state.currentConversation.messages.findIndex(
                  (item) => item.id === message.id
                );
                if (existingIndex === -1) {
                  return [...state.currentConversation.messages, message];
                }
                const nextMessages = [...state.currentConversation.messages];
                nextMessages[existingIndex] = message;
                return nextMessages;
              })(),
              messageCount: Math.max(
                state.currentConversation.messageCount ?? state.currentConversation.messages.length,
                state.currentConversation.messages.some((item) => item.id === message.id)
                  ? state.currentConversation.messages.length
                  : state.currentConversation.messages.length + 1
              ),
              lastMessageAt: message.timestamp,
            }
          : state.currentConversation,
    }));
  },

  updateSettings(settings) {
    set((state) => ({
      settings: { ...state.settings, ...settings },
    }));
  },
}));

void useAppStore.getState().loadInitialData();
