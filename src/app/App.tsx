import { RouterProvider } from 'react-router';
import { router } from './routes';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/es/locale/zh_CN';

export default function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 8,
        },
      }}
    >
      <RouterProvider router={router} />
    </ConfigProvider>
  );
}