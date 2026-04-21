import { defineConfig } from 'tsup';
import vuePlugin from 'esbuild-plugin-vue3';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: false,
  outExtension: () => ({ js: '.mjs' }),
  clean: true,
  esbuildPlugins: [vuePlugin()],
  external: ['vue']
});
