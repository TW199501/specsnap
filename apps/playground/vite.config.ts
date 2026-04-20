import { defineConfig } from 'vite';

// Port 5173 is Vite's default and collides with many other Vite-based projects.
// 5999 is our chosen fixed port; if it's also taken, Vite falls back to the
// next free port and prints the actual URL to stdout.
export default defineConfig({
  server: {
    port: 5999
  }
});
