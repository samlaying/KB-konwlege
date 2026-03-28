import { useEffect, useState } from 'react';
import { Form, Select, Slider, Card, Typography, Space, Divider, Tag, Button, Alert, message, Spin } from 'antd';
import { useAppStore } from '../store';

const { Title, Text, Paragraph } = Typography;

export function SettingsPage() {
  const {
    bootstrapped,
    settings,
    settingsLoading,
    lastError,
    loadSettings,
    updateSettings,
    saveSettings,
  } = useAppStore();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (bootstrapped && !settingsLoading && !lastError) {
      void loadSettings();
    }
  }, [bootstrapped, lastError, loadSettings, settingsLoading]);

  const handleSave = async () => {
    setSaving(true);
    const result = await saveSettings();
    if (result) {
      message.success('设置已保存');
    } else {
      message.error(useAppStore.getState().lastError || '设置保存失败');
    }
    setSaving(false);
  };

  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto', background: '#fff' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          系统设置
        </Title>
        <Text type="secondary">配置模型和检索参数</Text>
      </div>

      <div style={{ maxWidth: 800 }}>
        {lastError ? (
          <Alert
            type="error"
            showIcon
            title="设置加载或保存失败"
            description={lastError}
            style={{ marginBottom: 16 }}
          />
        ) : null}

        <Spin spinning={settingsLoading}>
          <Card title="模型配置" style={{ marginBottom: 24 }}>
            <Form layout="vertical">
              <Form.Item label="LLM 模型">
                <Select
                  value={settings.llmModel}
                  onChange={(value) => updateSettings({ llmModel: value })}
                  options={[
                    {
                      label: (
                        <Space>
                          <span>DeepSeek Chat</span>
                          <Tag color="green">推荐</Tag>
                        </Space>
                      ),
                      value: 'deepseek',
                    },
                    { label: '通义千问 Turbo', value: 'qwen' },
                    { label: '智谱 GLM-4', value: 'glm' },
                  ]}
                />
                <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
                  选择用于生成回答的大语言模型
                </Paragraph>
              </Form.Item>

              <Divider />

              <Form.Item label="Embedding 模型">
                <Select
                  value={settings.embeddingModel}
                  onChange={(value) => updateSettings({ embeddingModel: value })}
                  options={[
                    { label: 'bge-large-zh-v1.5 (推荐)', value: 'bge-large-zh-v1.5' },
                    { label: 'text-embedding-ada-002', value: 'text-embedding-ada-002' },
                    { label: 'm3e-base', value: 'm3e-base' },
                  ]}
                />
                <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
                  用于文本向量化的 Embedding 模型，影响检索准确度
                </Paragraph>
              </Form.Item>
            </Form>
          </Card>

          <Card title="检索参数" style={{ marginBottom: 24 }}>
            <Form layout="vertical">
              <Form.Item label={`Top-K: ${settings.topK}`}>
                <Slider
                  min={1}
                  max={10}
                  value={settings.topK}
                  onChange={(value) => updateSettings({ topK: value })}
                  marks={{
                    1: '1',
                    5: '5',
                    10: '10',
                  }}
                />
                <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
                  每次检索返回的最相关文档片段数量，值越大上下文越丰富但可能包含噪声
                </Paragraph>
              </Form.Item>

              <Divider />

              <Form.Item label={`Temperature: ${settings.temperature}`}>
                <Slider
                  min={0}
                  max={1}
                  step={0.1}
                  value={settings.temperature}
                  onChange={(value) => updateSettings({ temperature: value })}
                  marks={{
                    0: '0',
                    0.5: '0.5',
                    1: '1',
                  }}
                />
                <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
                  控制模型生成的随机性，0 = 确定性最高，1 = 创造性最强
                </Paragraph>
              </Form.Item>
            </Form>
          </Card>

          <Card title="关于系统" style={{ marginBottom: 24 }}>
            <Space orientation="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>系统版本：</Text>
                <Text>v1.0.0</Text>
              </div>
              <div>
                <Text strong>架构：</Text>
                <Text>RAG (Retrieval-Augmented Generation)</Text>
              </div>
              <div>
                <Text strong>向量数据库：</Text>
                <Text>ChromaDB (本地持久化)</Text>
              </div>
              <div>
                <Text strong>前端框架：</Text>
                <Text>React 18 + Ant Design 5 + Zustand</Text>
              </div>
              <Divider />
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                💡 <strong>提示：</strong>本系统现在已切到真实后端状态层，部署时仍需要配置后端服务与可用模型。
              </Paragraph>
            </Space>
          </Card>
        </Spin>

        <Space>
          <Button type="primary" onClick={handleSave} loading={saving || settingsLoading}>
            保存设置
          </Button>
          <Button onClick={() => void loadSettings()} disabled={saving}>
            重新加载
          </Button>
        </Space>
      </div>
    </div>
  );
}
