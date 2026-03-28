import { Layout as AntLayout, Menu } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router';
import {
  MessageOutlined,
  AppstoreOutlined,
  FileTextOutlined,
  HistoryOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

const { Sider, Content } = AntLayout;

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems: MenuProps['items'] = [
    {
      key: '/',
      icon: <MessageOutlined />,
      label: '对话问答',
    },
    {
      key: '/themes',
      icon: <AppstoreOutlined />,
      label: '主题管理',
    },
    {
      key: '/documents',
      icon: <FileTextOutlined />,
      label: '知识库',
    },
    {
      key: '/history',
      icon: <HistoryOutlined />,
      label: '历史记录',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '设置',
    },
  ];

  const handleMenuClick: MenuProps['onClick'] = (e) => {
    navigate(e.key);
  };

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider width={200} theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            fontWeight: 600,
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          📚 知识库问答
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ border: 'none' }}
        />
      </Sider>
      <Content style={{ background: '#f5f5f5' }}>
        <Outlet />
      </Content>
    </AntLayout>
  );
}
