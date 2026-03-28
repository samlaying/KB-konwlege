import { useEffect, useRef, useState } from 'react';
import {
  Button,
  Table,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  Upload,
  Popconfirm,
  Typography,
  message,
  Alert,
  Progress,
  Empty,
  Spin,
} from 'antd';
import {
  UploadOutlined,
  LinkOutlined,
  FileTextOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAppStore } from '../store';
import { Document } from '../types';

const { Title, Text } = Typography;
const { TextArea } = Input;

type ImportType = 'file' | 'url' | 'text';
const ALL_THEMES = '__all__';

export function DocumentsPage() {
  const {
    bootstrapped,
    themes,
    documents,
    documentLoading,
    themeLoading,
    lastError,
    loadThemes,
    loadDocuments,
    uploadDocumentFile,
    createDocumentByUrl,
    createDocumentByText,
    deleteDocument,
    refreshDocumentStatus,
  } = useAppStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [importType, setImportType] = useState<ImportType>('file');
  const [selectedThemeId, setSelectedThemeId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const pollingTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const [form] = Form.useForm();

  useEffect(() => {
    if (bootstrapped && themes.length === 0 && !themeLoading && !lastError) {
      void loadThemes();
    }
    if (bootstrapped && documents.length === 0 && !documentLoading && !lastError) {
      void loadDocuments();
    }
  }, [
    bootstrapped,
    documentLoading,
    documents.length,
    lastError,
    loadDocuments,
    loadThemes,
    themeLoading,
    themes.length,
  ]);

  useEffect(() => {
    documents
      .filter((document) => document.status === 'pending' || document.status === 'indexing')
      .forEach((document) => {
        if (!pollingTimersRef.current.has(document.id)) {
          schedulePolling(document.id);
        }
      });

    return () => {
      pollingTimersRef.current.forEach((timer) => clearTimeout(timer));
      pollingTimersRef.current.clear();
    };
  }, [documents]);

  const stopPolling = (documentId: number) => {
    const timer = pollingTimersRef.current.get(documentId);
    if (timer) {
      clearTimeout(timer);
      pollingTimersRef.current.delete(documentId);
    }
  };

  const schedulePolling = (documentId: number) => {
    stopPolling(documentId);
    const timer = setTimeout(async () => {
      const document = await refreshDocumentStatus(documentId);
      if (!document) {
        stopPolling(documentId);
        return;
      }

      if (document.status === 'pending' || document.status === 'indexing') {
        schedulePolling(documentId);
        return;
      }

      stopPolling(documentId);
      if (document.status === 'done') {
        message.success(`文档《${document.filename}》索引完成`);
      }
      if (document.status === 'failed') {
        message.error(document.errorMessage || `文档《${document.filename}》索引失败`);
      }
    }, 2500);

    pollingTimersRef.current.set(documentId, timer);
  };

  const handleOpenModal = (type: ImportType) => {
    setImportType(type);
    setIsModalOpen(true);
    form.resetFields();
    if (themes.length > 0) {
      form.setFieldValue('themeId', themes[0].id);
      setSelectedThemeId(themes[0].id);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    form.resetFields();
    setUploadProgress(null);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      let createdDocument: Document | null = null;
      if (importType === 'file') {
        const file = values.file?.fileList?.[0]?.originFileObj || values.file?.file;
        if (!file) {
          message.error('请先选择要上传的文件');
          return;
        }
        createdDocument = await uploadDocumentFile(
          {
            themeId: values.themeId,
            file,
          },
          (progress) => setUploadProgress(progress)
        );
      } else if (importType === 'url') {
        createdDocument = await createDocumentByUrl({
          themeId: values.themeId,
          url: values.url,
          title: values.title,
        });
      } else {
        createdDocument = await createDocumentByText({
          themeId: values.themeId,
          title: values.title,
          content: values.content,
        });
      }

      if (!createdDocument) {
        message.error(useAppStore.getState().lastError || '文档导入失败');
        return;
      }

      message.success('文档已提交，正在同步索引状态');
      if (createdDocument.status === 'pending' || createdDocument.status === 'indexing') {
        schedulePolling(createdDocument.id);
      }

      handleCloseModal();
    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    stopPolling(id);
    await deleteDocument(id);
    const nextError = useAppStore.getState().lastError;
    if (nextError) {
      message.error(nextError);
      return;
    }
    message.success('文档已删除');
  };

  const columns: ColumnsType<Document> = [
    {
      title: '文件名',
      dataIndex: 'filename',
      key: 'filename',
      render: (text) => (
        <Space>
          <FileTextOutlined />
          <Text>{text}</Text>
        </Space>
      ),
    },
    {
      title: '所属主题',
      dataIndex: 'themeId',
      key: 'themeId',
      render: (themeId) => {
        const theme = themes.find((t) => t.id === themeId);
        return theme ? (
          <Space>
            <span>{theme.icon}</span>
            <Text>{theme.name}</Text>
          </Space>
        ) : (
          '-'
        );
      },
    },
    {
      title: '类型',
      dataIndex: 'fileType',
      key: 'fileType',
      render: (type) => {
        const colorMap = {
          pdf: 'red',
          docx: 'blue',
          md: 'green',
          txt: 'default',
          url: 'purple',
        };
        return <Tag color={colorMap[type as keyof typeof colorMap]}>{type.toUpperCase()}</Tag>;
      },
    },
    {
      title: '段落数',
      dataIndex: 'chunkCount',
      key: 'chunkCount',
      align: 'center',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => {
        const statusConfig = {
          done: { icon: <CheckCircleOutlined />, color: 'success', text: '已索引' },
          indexing: { icon: <SyncOutlined spin />, color: 'processing', text: '索引中' },
          pending: { icon: <ClockCircleOutlined />, color: 'default', text: '等待中' },
          failed: { icon: <CloseCircleOutlined />, color: 'error', text: '失败' },
        };
        const config = statusConfig[status as keyof typeof statusConfig];
        return (
          <Space orientation="vertical" size={4}>
            <Tag icon={config.icon} color={config.color}>
              {config.text}
            </Tag>
            {record.errorMessage ? (
              <Text type="danger" style={{ fontSize: 12 }}>
                {record.errorMessage}
              </Text>
            ) : null}
          </Space>
        );
      },
    },
    {
      title: '路径',
      dataIndex: 'filePath',
      key: 'filePath',
      ellipsis: true,
      render: (filePath) => (
        <Text type="secondary" ellipsis={{ tooltip: filePath }} style={{ maxWidth: 260 }}>
          {filePath}
        </Text>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          {(record.status === 'pending' || record.status === 'indexing') && (
            <Button type="link" onClick={() => schedulePolling(record.id)}>
              刷新状态
            </Button>
          )}
          <Popconfirm
            title="确认删除"
            description="删除文档将同时清理向量库中的数据，确定要删除吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const filteredDocuments =
    selectedThemeId === null
      ? documents
      : documents.filter((doc) => doc.themeId === selectedThemeId);

  const isBusy = documentLoading || themeLoading;

  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto', background: '#fff' }}>
      <div
        style={{
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <Title level={2} style={{ margin: 0 }}>
            知识库管理
          </Title>
          <Text type="secondary">导入和管理文档</Text>
        </div>
        <Space>
          <Button icon={<UploadOutlined />} onClick={() => handleOpenModal('file')}>
            上传文档
          </Button>
          <Button icon={<LinkOutlined />} onClick={() => handleOpenModal('url')}>
            导入网页
          </Button>
          <Button icon={<PlusOutlined />} onClick={() => handleOpenModal('text')}>
            添加文本
          </Button>
        </Space>
      </div>

      {lastError ? (
        <Alert
          type="error"
          showIcon
          title="文档操作失败"
          description={lastError}
          style={{ marginBottom: 16 }}
        />
      ) : null}

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Select
          style={{ width: 220 }}
          placeholder="筛选主题"
          allowClear
          value={selectedThemeId === null ? ALL_THEMES : selectedThemeId}
          onChange={(value) => setSelectedThemeId(value === ALL_THEMES ? null : Number(value))}
          options={[
            { label: '全部主题', value: ALL_THEMES },
            ...themes.map((theme) => ({
              label: `${theme.icon} ${theme.name}`,
              value: theme.id,
            })),
          ]}
        />
        <Button onClick={() => void loadDocuments(selectedThemeId ?? undefined)} loading={documentLoading}>
          刷新列表
        </Button>
      </div>

      <Spin spinning={isBusy && documents.length > 0}>
        {filteredDocuments.length === 0 && !isBusy ? (
          <Empty description="暂无文档，先导入一个知识源" style={{ marginTop: 80 }} />
        ) : (
          <Table
            columns={columns}
            dataSource={filteredDocuments}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        )}
      </Spin>

      <Modal
        title={
          importType === 'file'
            ? '上传文档'
            : importType === 'url'
            ? '导入网页'
            : '添加文本'
        }
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={handleCloseModal}
        okText="导入"
        cancelText="取消"
        width={600}
        confirmLoading={submitting}
        forceRender
      >
        <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item
            label="选择主题"
            name="themeId"
            rules={[{ required: true, message: '请选择主题' }]}
          >
            <Select
              placeholder="选择一个主题"
              options={themes.map((theme) => ({
                label: `${theme.icon} ${theme.name}`,
                value: theme.id,
              }))}
            />
          </Form.Item>

          {importType === 'file' && (
            <Form.Item
              label="选择文件"
              name="file"
              valuePropName="fileList"
              getValueFromEvent={(event) => event?.fileList ?? []}
              rules={[{ required: true, message: '请上传文件' }]}
            >
              <Upload
                maxCount={1}
                beforeUpload={() => false}
                accept=".pdf,.docx,.doc,.md,.txt"
                onChange={() => setUploadProgress(null)}
              >
                <Button icon={<UploadOutlined />}>选择文件</Button>
              </Upload>
            </Form.Item>
          )}

          {importType === 'file' && uploadProgress !== null ? (
            <Form.Item label="上传进度">
              <Progress percent={uploadProgress} size="small" />
            </Form.Item>
          ) : null}

          {importType === 'url' && (
            <>
              <Form.Item
                label="网页 URL"
                name="url"
                rules={[
                  { required: true, message: '请输入网页地址' },
                  { type: 'url', message: '请输入有效的URL' },
                ]}
              >
                <Input placeholder="https://example.com/article" />
              </Form.Item>
              <Form.Item label="标题" name="title">
                <Input placeholder="可选，留空将自动提取" />
              </Form.Item>
            </>
          )}

          {importType === 'text' && (
            <>
              <Form.Item
                label="标题"
                name="title"
                rules={[{ required: true, message: '请输入标题' }]}
              >
                <Input placeholder="文档标题" />
              </Form.Item>
              <Form.Item
                label="内容"
                name="content"
                rules={[{ required: true, message: '请输入内容' }]}
              >
                <TextArea rows={10} placeholder="粘贴或输入文本内容..." />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
}
