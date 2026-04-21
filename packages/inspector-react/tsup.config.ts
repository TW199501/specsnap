import { defineConfig } from 'tsup';
import { copyFileSync } from 'node:fs';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  outExtension({ format }) {
    return { js: format === 'esm' ? '.mjs' : '.cjs' };
  },
  external: ['react', 'react-dom', 'react/jsx-runtime', '@tw199501/specsnap-inspector-core'],
  async onSuccess() {
    copyFileSync('src/styles.css', 'dist/styles.css');
  }
});
