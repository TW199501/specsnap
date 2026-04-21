<template>
  <main class="page">
    <header>
      <h1>SpecSnap Inspector — Vue 3 demo</h1>
      <p class="lead">
        Click the blue ◎ button (bottom-right) to open the Inspector panel, then
        <strong>Start Inspect</strong>, then click any element below.
      </p>
    </header>

    <section class="targets">
      <div class="row">
        <button class="btn-primary">Save</button>
        <input class="input" placeholder="username" />
        <a class="link" href="#">Read the docs</a>
      </div>

      <div class="card">
        <h2>A dark card</h2>
        <p>with some <strong>styled text</strong> for inspection.</p>
      </div>

      <div class="grid">
        <div class="tile">Tile A</div>
        <div class="tile">Tile B</div>
        <div class="tile">Tile C</div>
      </div>
    </section>

    <SpecSnapInspector @copy="onCopy" @capture="onCapture" />
  </main>
</template>

<script setup lang="ts">
import { SpecSnapInspector } from '@tw199501/specsnap-inspector-vue';
import type { Session } from '@tw199501/specsnap-inspector-vue';

function onCopy(markdown: string): void {
  // eslint-disable-next-line no-console
  console.log('[demo-vue] Copied MD length:', markdown.length);
}

function onCapture(payload: { frameIndex: number; session: Session }): void {
  // eslint-disable-next-line no-console
  console.log('[demo-vue] Captured frame #' + payload.frameIndex, payload.session.frames.length, 'total');
}
</script>

<style>
.page {
  max-width: 920px;
  margin: 32px auto;
  padding: 0 24px;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  color: #0f172a;
}
.lead { color: #475569; line-height: 1.5; }
.targets {
  border: 2px dashed #cbd5e1;
  padding: 24px;
  border-radius: 12px;
  display: grid;
  gap: 16px;
}
.row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.btn-primary {
  padding: 8px 20px;
  background: #f97316;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}
.input {
  padding: 8px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 14px;
}
.link { color: #2563eb; text-decoration: underline; }
.card {
  background: #0f172a;
  color: white;
  padding: 16px 20px;
  border-radius: 8px;
  max-width: 280px;
}
.card h2 { margin: 0 0 8px; font-size: 16px; }
.card p { margin: 0; color: #cbd5e1; }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.tile {
  padding: 24px;
  background: #f1f5f9;
  border-radius: 8px;
  text-align: center;
  font-weight: 600;
}
</style>
