import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import * as path from 'path'

// 获取环境变量
const env = process.env.NODE_ENV


// 自定义插件：在生产环境中移除 console.log
const removeConsolePlugin = {
  name: 'remove-console',
  transform(code: string, id: string) {
    if (process.env.NODE_ENV === 'production') {
      return {
        code: code.replace(/console\.log\(.*?\);?/g, ''),
        map: null
      }
    }
    return null
  }
}

export default defineConfig({
  plugins: [
    vue(),
    // removeConsolePlugin
  ],
  base: '/', // Ensure base URL is set to root
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      vue: 'vue/dist/vue.esm-bundler.js'
    }
  },
  server: {
    host: true,
    port: 3004,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:1338',
        // target: 'https://api.garminface.com',
        changeOrigin: true,
        // rewrite: (path) => path.replace(/^\/api/, '')  // 如果后端不需要 /api 前缀，可以启用这行
      },
      '/wristo-api': {
        target: 'http://127.0.0.1:8088',
        // target: 'https://api.wristo.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/wristo-api/, '/api')
      }
    },
  },
  assetsInclude: ['**/*.woff2'],
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        // drop_console: true,
        drop_debugger: true
      }
    }
  }
})
