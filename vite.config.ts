import tailwindcss from '@tailwindcss/vite';
import path from 'path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

function getBasePath() {
  if (process.env.NODE_ENV !== 'production') {
    return '/';
  }

  const repoName =
    process.env.VITE_BASE_URL ||
    process.env.GITHUB_REPOSITORY ||
    'ocpp-simulate';
  const repoPath = repoName.includes('/') ? repoName.split('/')[1] : repoName;

  return `/${repoPath}/`;
}

export default defineConfig({
  base: getBasePath(),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
