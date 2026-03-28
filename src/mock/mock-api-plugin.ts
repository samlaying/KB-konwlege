import type { Plugin } from 'vite';
import {
  mockThemes,
  mockDocuments,
  mockConversations,
  mockSettings,
} from './mock-data';

export function mockApiPlugin(): Plugin {
  return {
    name: 'mock-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          return next();
        }

        res.setHeader('Content-Type', 'application/json');

        // GET /api/themes
        if (req.url === '/api/themes' && req.method === 'GET') {
          res.end(JSON.stringify(mockThemes));
          return;
        }

        // GET /api/documents
        if (req.url === '/api/documents' && req.method === 'GET') {
          res.end(JSON.stringify(mockDocuments));
          return;
        }

        // GET /api/conversations
        if (req.url === '/api/conversations' && req.method === 'GET') {
          res.end(JSON.stringify(mockConversations));
          return;
        }

        // GET /api/settings
        if (req.url === '/api/settings' && req.method === 'GET') {
          res.end(JSON.stringify(mockSettings));
          return;
        }

        // POST /api/themes
        if (req.url === '/api/themes' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
          req.on('end', () => {
            const payload = JSON.parse(body || '{}');
            const newTheme = {
              id: Date.now(),
              name: payload.name || '新主题',
              icon: payload.icon || '📚',
              description: payload.description || '',
              documentCount: 0,
              chunkCount: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            mockThemes.push(newTheme);
            res.end(JSON.stringify(newTheme));
          });
          return;
        }

        // PUT /api/settings
        if (req.url === '/api/settings' && req.method === 'PUT') {
          let body = '';
          req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
          req.on('end', () => {
            const payload = JSON.parse(body || '{}');
            Object.assign(mockSettings, payload);
            res.end(JSON.stringify(mockSettings));
          });
          return;
        }

        // DELETE /api/themes/:id
        const themeDeleteMatch = req.url?.match(/^\/api\/themes\/(\d+)$/);
        if (themeDeleteMatch && req.method === 'DELETE') {
          const id = Number(themeDeleteMatch[1]);
          const index = mockThemes.findIndex((t) => t.id === id);
          if (index !== -1) mockThemes.splice(index, 1);
          res.end(JSON.stringify({ ok: true }));
          return;
        }

        // DELETE /api/documents/:id
        const docDeleteMatch = req.url?.match(/^\/api\/documents\/(\d+)$/);
        if (docDeleteMatch && req.method === 'DELETE') {
          const id = Number(docDeleteMatch[1]);
          const index = mockDocuments.findIndex((d) => d.id === id);
          if (index !== -1) mockDocuments.splice(index, 1);
          res.end(JSON.stringify({ ok: true }));
          return;
        }

        // DELETE /api/conversations/:id
        const convDeleteMatch = req.url?.match(/^\/api\/conversations\/(\d+)$/);
        if (convDeleteMatch && req.method === 'DELETE') {
          const id = Number(convDeleteMatch[1]);
          const index = mockConversations.findIndex((c) => c.id === id);
          if (index !== -1) mockConversations.splice(index, 1);
          res.end(JSON.stringify({ ok: true }));
          return;
        }

        // GET /api/conversations/:id
        const convGetMatch = req.url?.match(/^\/api\/conversations\/(\d+)$/);
        if (convGetMatch && req.method === 'GET') {
          const id = Number(convGetMatch[1]);
          const conv = mockConversations.find((c) => c.id === id);
          res.end(JSON.stringify(conv || null));
          return;
        }

        // POST /api/conversations
        if (req.url === '/api/conversations' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
          req.on('end', () => {
            const payload = JSON.parse(body || '{}');
            const newConv = {
              id: Date.now(),
              themeId: Number(payload.themeId) || 1,
              title: payload.title || '新对话',
              messages: [],
              llmModel: payload.llmModel || 'deepseek',
              messageCount: 0,
              lastMessageAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            mockConversations.push(newConv);
            res.end(JSON.stringify(newConv));
          });
          return;
        }

        // Fallback: pass to proxy if available, otherwise 404
        next();
      });
    },
  };
}
