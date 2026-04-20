import { defineConfig } from 'vite';

// Port 5999 is fixed — we advertise this port publicly, so letting Vite
// silently drift to 6000/6001 when it's busy would make our docs lie.
// Two layers protect the contract:
//   1. `predev` npm script runs scripts/kill-port.mjs 5999 to free the port
//      before Vite starts (handles the common "zombie dev server" case).
//   2. `strictPort: true` makes Vite fail loudly if 5999 is STILL taken
//      (e.g. kill didn't have permission) instead of drifting up.
export default defineConfig({
  server: {
    port: 5999,
    strictPort: true
  }
});
