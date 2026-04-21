import { defineConfig } from 'tsup';
import vuePlugin from 'esbuild-plugin-vue3';
import { copyFileSync } from 'node:fs';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: false,
  sourcemap: true,
  clean: true,
  outExtension: () => ({ js: '.mjs' }),
  esbuildPlugins: [vuePlugin()],
  external: ['vue', '@tw199501/specsnap-inspector-core'],
  async onSuccess() {
    copyFileSync('src/styles.css', 'dist/styles.css');
  }
});
