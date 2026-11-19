import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// 一般部署：npm run build → dist/（多檔，放到與 PAW 同網域的網頁伺服器）
// 預覽單檔：npm run build:preview → dist-preview/index.html（所有資源內嵌）
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'singlefile' ? [react(), viteSingleFile()] : [react()],
  build: {
    outDir: mode === 'singlefile' ? 'dist-preview' : 'dist',
    assetsInlineLimit: mode === 'singlefile' ? 100000000 : 4096,
  },
}));
