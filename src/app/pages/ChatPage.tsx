import { useEffect, useRef, useState } from 'react';
import { Layout, Input, Button, Card, Empty, Tag, Space, Typography, Spin, Alert, message } from 'antd';
import { SendOutlined, PlusOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { chatApi, normalizeApiError } from '../services/api';
import { useAppStore } from '../store';
import type { Message } from '../types';

const { Sider, Content } = Layout;
const { TextArea } = Input;
const { Text, Title } = Typography;

export function ChatPage() {
  const {
    bootstrapped,
    themes,
    themeLoading,
    selectedThemeId,
    loadThemes,
    selectTheme,
    currentConversation,
    conversationLoading,
    lastError,
    setCurrentConversation,
    createConversation,
    addMessageToConversation,
    upsertMessageInConversation,
    loadConversationDetail,
    settings,
  } = useAppStore();

  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamAbortRef = useRef<{ abort(): void } | null>(null);

  useEffect(() => {
    if (bootstrapped && themes.length === 0 && !themeLoading && !lastError) {
      void loadThemes();
    }
  }, [bootstrapped, lastError, loadThemes, themeLoading, themes.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentConversation?.messages]);

  useEffect(() => () => streamAbortRef.current?.abort(), []);

  const handleThemeSelect = (themeId: number) => {
    selectTheme(themeId);
    setCurrentConversation(null);
    setStreamError(null);
  };

  const handleNewChat = () => {
    streamAbortRef.current?.abort();
    setCurrentConversation(null);
    setStreamError(null);
  };

  const handleSend = async () => {
    const question = inputValue.trim();
    if (!question || !selectedThemeId || isSending) {
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
      timestamp: new Date().toISOString(),
    };
    const assistantMessageId = `${userMessage.id}-assistant`;
    const assistantPlaceholder: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      status: 'streaming',
    };

    setInputValue('');
    setIsSending(true);
    setStreamError(null);

    try {
      let conversation = currentConversation;
      if (!conversation || conversation.themeId !== selectedThemeId) {
        conversation = await createConversation({
          themeId: selectedThemeId,
          title: question.slice(0, 20) + (question.length > 20 ? '...' : ''),
          messages: [],
          llmModel: settings.llmModel,
          createdAt: new Date().toISOString(),
        });
      }

      if (!conversation) {
        message.error(useAppStore.getState().lastError || '对话创建失败');
        setIsSending(false);
        return;
      }

      setCurrentConversation(conversation);
      addMessageToConversation(conversation.id, userMessage);
      upsertMessageInConversation(conversation.id, assistantPlaceholder);

      streamAbortRef.current?.abort();
      streamAbortRef.current = chatApi.streamChat(
        {
          themeId: selectedThemeId,
          question,
          conversationId: conversation.id,
          settings,
        },
        {
          onStart: (event) => {
            const nextConversationId = Number(event.conversationId);
            if (nextConversationId !== conversation.id) {
              void loadConversationDetail(nextConversationId);
            }
          },
          onDelta: ({ delta }) => {
            const current = useAppStore
              .getState()
              .currentConversation?.messages.find((item) => item.id === assistantMessageId);
            upsertMessageInConversation(conversation.id, {
              ...(current || assistantPlaceholder),
              id: assistantMessageId,
              role: 'assistant',
              content: `${current?.content || ''}${delta}`,
              timestamp: current?.timestamp || assistantPlaceholder.timestamp,
              status: 'streaming',
            });
          },
          onSources: ({ sources }) => {
            const current = useAppStore
              .getState()
              .currentConversation?.messages.find((item) => item.id === assistantMessageId);
            upsertMessageInConversation(conversation.id, {
              ...(current || assistantPlaceholder),
              sources,
              status: 'streaming',
            });
          },
          onDone: async () => {
            const current = useAppStore
              .getState()
              .currentConversation?.messages.find((item) => item.id === assistantMessageId);
            if (current) {
              upsertMessageInConversation(conversation.id, {
                ...current,
                status: 'done',
              });
            }
            await loadConversationDetail(conversation.id);
            setIsSending(false);
          },
          onError: (event) => {
            const readableError = event.message || '对话流中断';
            setStreamError(readableError);
            const current = useAppStore
              .getState()
              .currentConversation?.messages.find((item) => item.id === assistantMessageId);
            upsertMessageInConversation(conversation.id, {
              ...(current || assistantPlaceholder),
              status: 'failed',
              errorMessage: readableError,
            });
            setIsSending(false);
          },
        }
      );
    } catch (error) {
      setStreamError(normalizeApiError(error).message);
      setIsSending(false);
    }
  };

  const selectedTheme = themes.find((theme) => theme.id === selectedThemeId);

  return (
    <Layout style={{ height: '100vh', background: '#fff' }}>
      <Sider width={280} theme="light" style={{ borderRight: '1px solid #f0f0f0', overflow: 'auto' }}>
        <div style={{ padding: 16 }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            block
            onClick={handleNewChat}
            style={{ marginBottom: 16 }}
          >
            新建对话
          </Button>

          <Title level={5} style={{ marginBottom: 16 }}>
            选择主题
          </Title>

          <Spin spinning={themeLoading && themes.length > 0}>
            <Space orientation="vertical" style={{ width: '100%' }} size="middle">
              {themes.map((theme) => (
                <Card
                  key={theme.id}
                  hoverable
                  size="small"
                  onClick={() => handleThemeSelect(theme.id)}
                  style={{
                    cursor: 'pointer',
                    border: selectedThemeId === theme.id ? '2px solid #1890ff' : '1px solid #f0f0f0',
                    background: selectedThemeId === theme.id ? '#e6f7ff' : '#fff',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontSize: 32 }}>{theme.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>{theme.name}</div>
                      <Space size="small">
                        <Tag color="blue">{theme.documentCount} 文档</Tag>
                        <Tag color="green">{theme.chunkCount} 段落</Tag>
                      </Space>
                    </div>
                  </div>
                </Card>
              ))}
            </Space>
          </Spin>
        </div>
      </Sider>

      <Content style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {lastError ? (
          <Alert
            type="error"
            showIcon
            title="后端请求失败"
            description={lastError}
            style={{ margin: 16, marginBottom: 0 }}
          />
        ) : null}

        {streamError ? (
          <Alert
            type="warning"
            showIcon
            title="对话流异常"
            description={streamError}
            style={{ margin: 16, marginBottom: 0 }}
          />
        ) : null}

        {!selectedTheme ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
            }}
          >
            <Empty description="请先选择一个主题开始对话" />
          </div>
        ) : (
          <>
            <div
              style={{
                padding: '16px 24px',
                borderBottom: '1px solid #f0f0f0',
                background: '#fff',
              }}
            >
              <Space>
                <span style={{ fontSize: 24 }}>{selectedTheme.icon}</span>
                <div>
                  <Title level={4} style={{ margin: 0 }}>
                    {selectedTheme.name}
                  </Title>
                  <Text type="secondary">{selectedTheme.description}</Text>
                </div>
              </Space>
            </div>

            <div
              style={{
                flex: 1,
                overflow: 'auto',
                padding: 24,
                background: '#fafafa',
              }}
            >
              {conversationLoading && !currentConversation ? (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 80 }}>
                  <Spin />
                </div>
              ) : !currentConversation?.messages.length ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                  }}
                >
                  <Empty description="开始新的对话吧！" />
                </div>
              ) : (
                <Space orientation="vertical" style={{ width: '100%' }} size="large">
                  {currentConversation.messages.map((chatMessage) => (
                    <div
                      key={chatMessage.id}
                      style={{
                        display: 'flex',
                        justifyContent: chatMessage.role === 'user' ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <div
                        style={{
                          maxWidth: '70%',
                          padding: '12px 16px',
                          borderRadius: 8,
                          background: chatMessage.role === 'user' ? '#1890ff' : '#fff',
                          color: chatMessage.role === 'user' ? '#fff' : '#000',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        }}
                      >
                        {chatMessage.role === 'assistant' ? (
                          <div className="markdown-content">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {chatMessage.content || (chatMessage.status === 'streaming' ? '...' : '')}
                            </ReactMarkdown>
                            {chatMessage.sources?.length ? (
                              <Space orientation="vertical" size="small" style={{ marginTop: 12, width: '100%' }}>
                                {chatMessage.sources.map((source, index) => (
                                  <Tag key={`${chatMessage.id}-${index}`} color="blue">
                                    {source.documentName}
                                    {source.pageNumber ? ` · 第 ${source.pageNumber} 页` : ''}
                                  </Tag>
                                ))}
                              </Space>
                            ) : null}
                            {chatMessage.errorMessage ? (
                              <Text type="danger">{chatMessage.errorMessage}</Text>
                            ) : null}
                          </div>
                        ) : (
                          <div>{chatMessage.content}</div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isSending && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                      <Card
                        size="small"
                        style={{
                          maxWidth: '70%',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        }}
                      >
                        <Space>
                          <Spin size="small" />
                          <Text type="secondary">正在生成回答...</Text>
                        </Space>
                      </Card>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </Space>
              )}
            </div>

            <div
              style={{
                padding: 16,
                borderTop: '1px solid #f0f0f0',
                background: '#fff',
              }}
            >
              <Space.Compact style={{ width: '100%' }}>
                <TextArea
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  onPressEnter={(event) => {
                    if (!event.shiftKey) {
                      event.preventDefault();
                      void handleSend();
                    }
                  }}
                  placeholder="输入问题... (Shift+Enter 换行)"
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  disabled={isSending}
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={() => void handleSend()}
                  loading={isSending}
                  disabled={!inputValue.trim()}
                  style={{ height: 'auto' }}
                >
                  发送
                </Button>
              </Space.Compact>
            </div>
          </>
        )}
      </Content>
    </Layout>
  );
}
