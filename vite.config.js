import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import Components from 'unplugin-vue-components/vite'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'
import viteCompression from 'vite-plugin-compression';
import removeConsole from 'vite-plugin-remove-console';
import { resolve } from 'path'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    vue(),
    vueJsx(),
    Components({
      resolvers: [AntDesignVueResolver()]
    }),
    nodePolyfills(),
    viteCompression({
      deleteOriginFile: false, //删除源文件
      threshold: 10240, //压缩前最小文件大小
      algorithm: 'gzip', //压缩算法
      ext: '.gz', //文件类型
    }),
    // removeConsole()
  ],
  resolve: {
    alias: [
      { find: '@', replacement: resolve(__dirname, 'src') },
      { find: /^~/, replacement: '' },
    ]
  },
  // 开启less支持
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true
      }
    }
  },
  server: {
    host: true,
    proxy: {
      '/api': {
        target: `http://localhost:8990`,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  build: {
    // 应用包含 mermaid、ace 等大型依赖，且部分通过动态 import 懒加载，
    // 适当放宽 chunk 体积告警阈值。
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      input: 'doc.html',
      // 忽略第三方依赖（如 js-md5）内部使用 eval 产生的告警，
      // 这些告警来源于 node_modules，业务代码中的 eval 已被移除。
      onwarn(warning, warn) {
        if (warning.code === 'EVAL') {
          const file = warning.id || (warning.loc && warning.loc.file) || ''
          if (file.includes('node_modules')) return
        }
        warn(warning)
      },
      output: {
        chunkFileNames: 'webjars/js/[name]-[hash].js',
        entryFileNames: 'webjars/js/[name]-[hash].js',
        assetFileNames: 'webjars/[ext]/[name]-[hash].[ext]',
        // 将稳定的第三方依赖拆分为独立的 vendor chunk，减小入口产物体积并提升缓存命中率。
        // mermaid / ace / katex 等依赖自身已通过动态 import 懒加载，这里不干预，交由 Rollup 默认分包。
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('/node_modules/@ant-design/') || id.includes('/node_modules/ant-design-vue/')) {
            return 'antd'
          }
          if (
            id.includes('/node_modules/vue/') ||
            id.includes('/node_modules/@vue/') ||
            id.includes('/node_modules/vue-router/') ||
            id.includes('/node_modules/pinia/') ||
            id.includes('/node_modules/vue-i18n/') ||
            id.includes('/node_modules/@intlify/')
          ) {
            return 'vue'
          }
          if (
            id.includes('/node_modules/lodash/') ||
            id.includes('/node_modules/axios/') ||
            id.includes('/node_modules/dayjs/') ||
            id.includes('/node_modules/qs/') ||
            id.includes('/node_modules/xml2js/') ||
            id.includes('/node_modules/json5/') ||
            id.includes('/node_modules/js-md5/') ||
            id.includes('/node_modules/clipboard/') ||
            id.includes('/node_modules/localforage/') ||
            id.includes('/node_modules/async/') ||
            id.includes('/node_modules/marked/') ||
            id.includes('/node_modules/@babel/') ||
            id.includes('/node_modules/ast-types/')
          ) {
            return 'utils'
          }
        }
      }
    }
  }
})
