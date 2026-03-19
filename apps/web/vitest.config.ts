import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@op/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  esbuild: {
    // Не читать Nuxt-генерируемый tsconfig — он недоступен без npm run build
    tsconfigRaw: {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'bundler',
        strict: true,
        esModuleInterop: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'node',
  },
})
