import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Haraka Delivery',
        short_name: 'Haraka',
        description: 'On-Demand Delivery for Coastal Kenya',
        theme_color: '#FF6A1F',
        background_color: '#F4F2EF',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      { find: '@haraka/theme/styles', replacement: path.resolve(__dirname, '../packages/theme/src/styles/index.css') },
      { find: /^@haraka\/theme$/, replacement: path.resolve(__dirname, '../packages/theme/src/index.ts') },
      { find: /^@haraka\/shared-types$/, replacement: path.resolve(__dirname, '../packages/shared-types/src/index.ts') },
      { find: /^@haraka\/validation$/, replacement: path.resolve(__dirname, '../packages/validation/src/index.ts') },
      { find: /^@haraka\/i18n$/, replacement: path.resolve(__dirname, '../packages/i18n/src/index.ts') },
      { find: /^@haraka\/api-client$/, replacement: path.resolve(__dirname, '../packages/api-client/src/index.ts') },
    ],
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
    },
  },
});
