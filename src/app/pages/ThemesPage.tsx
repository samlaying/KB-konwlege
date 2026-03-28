import { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Modal,
  Form,
  Input,
  Space,
  Popconfirm,
  Tag,
  Typography,
  message,
  Empty,
  Alert,
  Spin,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useAppStore } from '../store';
import { Theme } from '../types';

const { Title, Text, Paragraph } = Typography;

const emojiOptions = ['💼', '🤖', '🏃', '💰', '📚', '🎨', '🔬', '🌍', '🎵', '🍕', '✈️', '💡'];

export function ThemesPage() {
  const {
    bootstrapped,
    themes,
    themeLoading,
    lastError,
    loadThemes,
    addTheme,
    updateTheme,
    deleteTheme,
  } = useAppStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const selectedIcon = Form.useWatch('icon', form);

  useEffect(() => {
    if (bootstrapped && themes.length === 0 && !themeLoading && !lastError) {
      void loadThemes();
    }
  }, [bootstrapped, lastError, loadThemes, themeLoading, themes.length]);

  const handleOpenModal = (theme?: Theme) => {
    if (theme) {
      setEditingTheme(theme);
      form.setFieldsValue(theme);
    } else {
      setEditingTheme(null);
      form.resetFields();
      form.setFieldValue('icon', '📚');
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTheme(null);
    form.resetFields();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      if (editingTheme) {
        await updateTheme(editingTheme.id, values);
        const nextError = useAppStore.getState().lastError;
        if (nextError) {
          message.error(nextError);
          return;
        }
        message.success('主题已更新');
      } else {
        await addTheme({
          ...values,
          documentCount: 0,
          chunkCount: 0,
        });
        const nextError = useAppStore.getState().lastError;
        if (nextError) {
          message.error(nextError);
          return;
        }
        message.success('主题已创建');
      }

      handleCloseModal();
    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    await deleteTheme(id);
    const nextError = useAppStore.getState().lastError;
    if (nextError) {
      message.error(nextError);
      return;
    }
    message.success('主题已删除');
  };

  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>
            主题管理
          </Title>
          <Text type="secondary">管理知识库主题分类</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => handleOpenModal()}>
          新建主题
        </Button>
      </div>

      {lastError ? (
        <Alert
          type="error"
          showIcon
          title="主题数据加载或保存失败"
          description={lastError}
          style={{ marginBottom: 16 }}
        />
      ) : null}

      <Spin spinning={themeLoading && themes.length > 0}>
        {themes.length === 0 && !themeLoading ? (
          <Empty description="暂无主题，先创建一个主题开始接入后端数据" style={{ marginTop: 80 }} />
        ) : (
          <Row gutter={[16, 16]}>
            {themes.map((theme) => (
              <Col key={theme.id} xs={24} sm={12} md={8} lg={6}>
                <Card
                  hoverable
                  actions={[
                    <EditOutlined key="edit" onClick={() => handleOpenModal(theme)} />,
                    <Popconfirm
                      title="确认删除"
                      description="删除主题将同时删除该主题下的所有文档和对话记录，确定要删除吗？"
                      onConfirm={() => handleDelete(theme.id)}
                      okText="确认"
                      cancelText="取消"
                      key="delete"
                    >
                      <DeleteOutlined />
                    </Popconfirm>,
                  ]}
                  style={{ height: '100%' }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 64, marginBottom: 16 }}>{theme.icon}</div>
                    <Title level={4} style={{ marginBottom: 8 }}>
                      {theme.name}
                    </Title>
                    <Paragraph
                      type="secondary"
                      ellipsis={{ rows: 2 }}
                      style={{ minHeight: 44, marginBottom: 16 }}
                    >
                      {theme.description}
                    </Paragraph>
                    <Space orientation="vertical" style={{ width: '100%' }}>
                      <Space>
                        <Tag icon={<FileTextOutlined />} color="blue">
                          {theme.documentCount} 文档
                        </Tag>
                        <Tag color="green">{theme.chunkCount} 段落</Tag>
                      </Space>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        更新于 {new Date(theme.updatedAt).toLocaleDateString('zh-CN')}
                      </Text>
                    </Space>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Spin>

      <Modal
        title={editingTheme ? '编辑主题' : '新建主题'}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={handleCloseModal}
        okText="保存"
        cancelText="取消"
        width={600}
        confirmLoading={submitting}
        forceRender
      >
        <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item
            label="主题图标"
            name="icon"
            rules={[{ required: true, message: '请选择图标' }]}
          >
            <Space wrap>
              {emojiOptions.map((emoji) => (
                <div
                  key={emoji}
                  onClick={() => form.setFieldValue('icon', emoji)}
                  style={{
                    fontSize: 32,
                    cursor: 'pointer',
                    padding: 8,
                    border: selectedIcon === emoji ? '2px solid #1890ff' : '2px solid transparent',
                    borderRadius: 8,
                    transition: 'all 0.3s',
                  }}
                >
                  {emoji}
                </div>
              ))}
            </Space>
          </Form.Item>

          <Form.Item
            label="主题名称"
            name="name"
            rules={[{ required: true, message: '请输入主题名称' }]}
          >
            <Input placeholder="例如：职场技能" />
          </Form.Item>

          <Form.Item
            label="主题描述"
            name="description"
            rules={[{ required: true, message: '请输入主题描述' }]}
          >
            <Input.TextArea rows={3} placeholder="简要描述该主题包含的内容..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
