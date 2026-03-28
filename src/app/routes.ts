import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { ChatPage } from './pages/ChatPage';
import { ThemesPage } from './pages/ThemesPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: ChatPage },
      { path: 'themes', Component: ThemesPage },
      { path: 'documents', Component: DocumentsPage },
      { path: 'history', Component: HistoryPage },
      { path: 'settings', Component: SettingsPage },
    ],
  },
]);
