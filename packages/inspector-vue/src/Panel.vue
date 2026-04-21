<template>
  <div
    class="specsnap-inspector-panel specsnap-inspector-root"
    :data-position="position"
    role="dialog"
    aria-label="SpecSnap Inspector"
  >
    <header class="specsnap-inspector-panel__header">
      <span class="specsnap-inspector-panel__title">{{ title }}</span>
      <span class="specsnap-inspector-panel__hint">next: {{ snapshot.nextCaptureId }}</span>
      <button
        type="button"
        class="specsnap-inspector-panel__close"
        aria-label="Close"
        @click="$emit('close')"
      >×</button>
    </header>

    <div class="specsnap-inspector-panel__actions">
      <button
        type="button"
        class="specsnap-btn-primary"
        :class="{ active: snapshot.picking }"
        @click="$emit('toggle-picker')"
      >
        {{ inspectLabel }}
      </button>
      <button
        type="button"
        @click="$emit('clear')"
        :disabled="snapshot.frames.length === 0"
      >Clear</button>
      <button
        type="button"
        @click="$emit('copy')"
        :disabled="snapshot.frames.length === 0"
      >Copy MD</button>
    </div>

    <div class="specsnap-inspector-panel__frames">
      <div v-if="snapshot.frames.length === 0" class="specsnap-inspector-empty">
        Click Start Inspect, then click any element in the target area.
      </div>
      <div
        v-for="(frame, i) in snapshot.frames"
        :key="i"
        class="specsnap-inspector-frame"
      >
        <span class="specsnap-inspector-frame__index">{{ i + 1 }}</span>
        <span>{{ describeFrame(frame) }}</span>
      </div>
    </div>

    <div
      v-if="statusMessage"
      class="specsnap-inspector-panel__status"
      :data-kind="statusKind"
    >{{ statusMessage }}</div>

    <details class="specsnap-inspector-panel__json">
      <summary>Raw JSON (machine consumers)</summary>
      <pre>{{ sessionJson }}</pre>
    </details>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { InspectorSnapshot, PanelPosition } from '@tw199501/specsnap-inspector-core';

const props = defineProps<{
  snapshot: InspectorSnapshot;
  position: PanelPosition;
  title: string;
}>();

defineEmits<{
  close: [];
  'toggle-picker': [];
  clear: [];
  copy: [];
}>();

const inspectLabel = computed(() => {
  const n = props.snapshot.frames.length;
  if (props.snapshot.picking) return `Done (${n})`;
  return n === 0 ? 'Start Inspect' : `Start Inspect · ${n}`;
});

const sessionJson = computed(() =>
  props.snapshot.session ? JSON.stringify(props.snapshot.session, null, 2) : 'No session yet.'
);

const statusMessage = computed(() => {
  const s = props.snapshot.lastSave;
  if (!s) return '';
  if (s.error) return `✗ ${s.error}`;
  if (s.strategy === 'fs-access') return `✓ Saved to ${s.location} (${s.fileCount} files)`;
  if (s.strategy === 'zip') return `✓ Downloaded ${s.location}`;
  if (s.strategy === 'individual') return `✓ Downloaded ${s.fileCount} files`;
  return '✓ Handled by app';
});

const statusKind = computed(() => {
  const s = props.snapshot.lastSave;
  if (!s) return 'info';
  return s.error ? 'error' : 'success';
});

function describeFrame(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : '';
  const cls = el.className && typeof el.className === 'string'
    ? '.' + el.className.split(/\s+/).filter(Boolean).slice(0, 2).join('.')
    : '';
  return `${tag}${id}${cls}`;
}
</script>
