import { useEffect } from 'react';
import { Card, Space, Tag, Button, Popconfirm, Typography, Empty, Alert, Spin, Flex, message } from 'antd';
import { DeleteOutlined, MessageOutlined } from '@ant-design/icons';
import { useAppStore } from '../store';
import { useNavigate } from 'react-router';

const { Title, Text } = Typography;

export function HistoryPage() {
  const {
    bootstrapped,
    conversations,
    conversationLoading,
    themes,
    lastError,
    loadConversations,
    loadThemes,
    loadConversationDetail,
    deleteConversation,
    setCurrentConversation,
    selectTheme,
  } = useAppStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (bootstrapped && conversations.length === 0 && !conversationLoading && !lastError) {
      void loadConversations();
    }
    if (bootstrapped && themes.length === 0 && !lastError) {
      void loadThemes();
    }
  }, [
    bootstrapped,
    conversationLoading,
    conversations.length,
    lastError,
    loadConversations,
    loadThemes,
    themes.length,
  ]);

  const handleRestoreConversation = async (conversationId: number) => {
    const conversation = await loadConversationDetail(conversationId);
    if (conversation) {
      setCurrentConversation(conversation);
      selectTheme(conversation.themeId);
      navigate('/');
    }
  };

  const handleDelete = async (id: number) => {
    await deleteConversation(id);
    const nextError = useAppStore.getState().lastError;
    if (nextError) {
      message.error(nextError);
      return;
    }
    message.success('对话已删除');
  };

  // Sort by created date, newest first
  const sortedConversations = [...conversations].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto', background: '#fff' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          历史记录
        </Title>
        <Text type="secondary">查看和恢复历史对话</Text>
      </div>

      {lastError ? (
        <Alert
          type="error"
          showIcon
          title="历史记录加载失败"
          description={lastError}
          style={{ marginBottom: 16 }}
        />
      ) : null}

      {conversationLoading && sortedConversations.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 80 }}>
          <Spin />
        </div>
      ) : sortedConversations.length === 0 ? (
        <Empty description="暂无对话记录" style={{ marginTop: 100 }} />
      ) : (
        <Flex gap={16} wrap="wrap">
          {sortedConversations.map((conversation) => {
            const theme = themes.find((t) => t.id === conversation.themeId);
            return (
              <Card
                key={conversation.id}
                style={{ flex: '1 1 280px', maxWidth: 360 }}
                hoverable
                onClick={() => handleRestoreConversation(conversation.id)}
                  actions={[
                    <Button
                      key="restore"
                      type="link"
                      icon={<MessageOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestoreConversation(conversation.id);
                      }}
                    >
                      恢复对话
                    </Button>,
                    <Popconfirm
                      key="delete"
                      title="确认删除"
                      description="确定要删除这条对话记录吗？"
                      onConfirm={(e) => {
                        e?.stopPropagation();
                        handleDelete(conversation.id);
                      }}
                      onCancel={(e) => e?.stopPropagation()}
                      okText="确认"
                      cancelText="取消"
                    >
                      <Button
                        type="link"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={(e) => e.stopPropagation()}
                      >
                        删除
                      </Button>
                    </Popconfirm>,
                  ]}
                >
                      <Space orientation="vertical" style={{ width: '100%' }}>
                    {theme && (
                      <Space>
                        <span style={{ fontSize: 24 }}>{theme.icon}</span>
                        <Tag color="blue">{theme.name}</Tag>
                      </Space>
                    )}
                    <Title level={5} ellipsis={{ rows: 2 }} style={{ margin: 0 }}>
                      {conversation.title}
                    </Title>
                      <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                        <Text type="secondary">
                        {conversation.messageCount ?? conversation.messages.length} 条消息
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                        {new Date(conversation.lastMessageAt || conversation.createdAt).toLocaleString('zh-CN')}
                        </Text>
                      <Tag>{conversation.llmModel.toUpperCase()}</Tag>
                    </Space>
                  </Space>
                </Card>
            );
          })}
        </Flex>
      )}
    </div>
  );
}
