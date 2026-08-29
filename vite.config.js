import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// base: './'  — игра на Яндексе раздаётся из подпапки, нужны относительные пути.
// singlefile  — итоговая сборка = один self-contained dist/index.html (CSS и JS инлайном),
//               минимум запросов => самая быстрая загрузка на платформе.
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  build: {
    outDir: 'dist',
    target: 'es2019',
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 500,
    reportCompressedSize: false
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    // Превью в песочнице проксируется через сторонний host — разрешаем любые host-заголовки в dev.
    allowedHosts: true
  }
});
