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
        :disabled="snapshot.frames.length === 0 || copyFeedback === 'copying'"
        :class="{ 'is-feedback-ok': copyFeedback === 'copied', 'is-feedback-err': copyFeedback === 'error' }"
      >{{ copyBtnLabel }}</button>
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
        <header class="specsnap-inspector-frame__row">
          <span class="specsnap-inspector-frame__index">{{ i + 1 }}</span>
          <span>{{ describeFrame(frame) }}</span>
        </header>
        <div v-if="snapshot.session && snapshot.session.frames[i]" class="specsnap-inspector-frame__detail">
          <div class="specsnap-inspector-frame__boxmodel">
            <BoxModelDiagram :frame="snapshot.session.frames[i]!" />
          </div>
          <dl class="specsnap-inspector-frame__meta">
            <div><dt>size</dt><dd>{{ frameSize(snapshot.session.frames[i]!) }}</dd></div>
            <div><dt>padding</dt><dd>{{ fourSides(snapshot.session.frames[i]!.boxModel.padding) }}</dd></div>
            <div><dt>border</dt><dd>{{ fourSides(snapshot.session.frames[i]!.boxModel.border) }}</dd></div>
            <div><dt>margin</dt><dd>{{ fourSides(snapshot.session.frames[i]!.boxModel.margin) }}</dd></div>
            <div><dt>font</dt><dd>{{ fontLine(snapshot.session.frames[i]!) }}</dd></div>
            <div class="specsnap-inspector-frame__meta-wide">
              <dt>family</dt><dd>{{ snapshot.session.frames[i]!.typography.fontFamily }}</dd>
            </div>
            <div><dt>bg</dt><dd>{{ backgroundLine(snapshot.session.frames[i]!) }}</dd></div>
            <div v-if="gapAfter(i)"><dt>↓ gap</dt><dd>{{ gapAfter(i) }}</dd></div>
          </dl>
        </div>
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
import BoxModelDiagram from './BoxModelDiagram.vue';
import type { InspectorSnapshot, PanelPosition, Session } from '@tw199501/specsnap-inspector-core';
type Frame = Session['frames'][number];

const props = withDefaults(defineProps<{
  snapshot: InspectorSnapshot;
  position: PanelPosition;
  title: string;
  copyFeedback?: 'idle' | 'copying' | 'copied' | 'error';
}>(), {
  copyFeedback: 'idle'
});

const copyBtnLabel = computed(() => {
  switch (props.copyFeedback) {
    case 'copying': return 'Copying…';
    case 'copied': return 'Copied ✓';
    case 'error': return 'Error ✗';
    default: return 'Copy MD';
  }
});

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

function frameSize(frame: Frame): string {
  return `${Math.round(frame.rect.width)} × ${Math.round(frame.rect.height)} px`;
}

function fourSides(sides: readonly [number, number, number, number]): string {
  return sides.map(n => Math.round(n)).join(' / ');
}

function rgbToHex(rgb: string): string {
  const m = rgb.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?/i);
  if (!m) return rgb;
  const [, r, g, b, a] = m;
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  const base = '#' + hex(+r!) + hex(+g!) + hex(+b!);
  // Collapse #aabbcc -> #abc when possible
  if (base[1] === base[2] && base[3] === base[4] && base[5] === base[6]) {
    const short = '#' + base[1] + base[3] + base[5];
    return a !== undefined && +a < 1 ? `${short} / ${a}` : short;
  }
  return a !== undefined && +a < 1 ? `${base} / ${a}` : base;
}

function fontLine(frame: Frame): string {
  const t = frame.typography;
  const lh = t.lineHeight === 'normal' ? '' : ` · ${t.lineHeight}`;
  return `${t.fontSize}px · ${t.fontWeight}${lh} · ${rgbToHex(t.color)}`;
}

function backgroundLine(frame: Frame): string {
  const bg = frame.background;
  const bgColor = rgbToHex(bg.color);
  const radius = fourSides(bg.borderRadius);
  const allZero = radius.replace(/[\s\/]/g, '') === '0000';
  return allZero ? bgColor : `${bgColor} · radius ${radius}`;
}

function gapAfter(i: number): string | null {
  const session = props.snapshot.session;
  if (!session) return null;
  const gap = session.gaps.find(g => g.from === i + 1 && g.to === i + 2);
  if (!gap) return null;
  return `${Math.round(gap.px)}px ${gap.axis}`;
}

function describeFrame(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : '';
  const cls = el.className && typeof el.className === 'string'
    ? '.' + el.className.split(/\s+/).filter(Boolean).slice(0, 2).join('.')
    : '';
  return `${tag}${id}${cls}`;
}
</script>
