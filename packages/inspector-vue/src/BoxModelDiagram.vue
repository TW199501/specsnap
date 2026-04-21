<template>
  <svg :width="W" :height="H" class="specsnap-inspector-bmdiag" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">
    <!-- margin layer (outermost) -->
    <rect :x="0.5" :y="0.5" :width="W - 1" :height="H - 1" fill="#fef3c7" stroke="#d97706" stroke-width="1" stroke-dasharray="4 3" rx="3" />
    <text x="6" y="12" font-size="9" fill="#92400e">margin</text>
    <text :x="W / 2" y="9" text-anchor="middle" font-size="9" fill="#92400e">{{ m[0] }}</text>
    <text :x="W - 4" :y="H / 2 + 3" text-anchor="end" font-size="9" fill="#92400e">{{ m[1] }}</text>
    <text :x="W / 2" :y="H - 3" text-anchor="middle" font-size="9" fill="#92400e">{{ m[2] }}</text>
    <text x="4" :y="H / 2 + 3" font-size="9" fill="#92400e">{{ m[3] }}</text>

    <!-- border layer -->
    <rect :x="mL" :y="mT" :width="W - mL - mR" :height="H - mT - mB" fill="#fde68a" stroke="#78350f" stroke-width="1" rx="2" />
    <text :x="mL + 4" :y="mT + 11" font-size="9" fill="#78350f">border</text>
    <text :x="W / 2" :y="mT + 8" text-anchor="middle" font-size="9" fill="#78350f">{{ b[0] }}</text>
    <text :x="W - mR - 4" :y="(mT + (H - mB)) / 2 + 3" text-anchor="end" font-size="9" fill="#78350f">{{ b[1] }}</text>
    <text :x="W / 2" :y="H - mB - 4" text-anchor="middle" font-size="9" fill="#78350f">{{ b[2] }}</text>
    <text :x="mL + 4" :y="(mT + (H - mB)) / 2 + 3" font-size="9" fill="#78350f">{{ b[3] }}</text>

    <!-- padding layer -->
    <rect :x="mL + bL" :y="mT + bT" :width="W - mL - mR - bL - bR" :height="H - mT - mB - bT - bB" fill="#bbf7d0" stroke="#15803d" stroke-width="1" stroke-dasharray="3 3" rx="2" />
    <text :x="mL + bL + 4" :y="mT + bT + 11" font-size="9" fill="#14532d">padding</text>
    <text :x="W / 2" :y="mT + bT + 8" text-anchor="middle" font-size="9" fill="#14532d">{{ p[0] }}</text>
    <text :x="W - mR - bR - 4" :y="(mT + bT + (H - mB - bB)) / 2 + 3" text-anchor="end" font-size="9" fill="#14532d">{{ p[1] }}</text>
    <text :x="W / 2" :y="H - mB - bB - 4" text-anchor="middle" font-size="9" fill="#14532d">{{ p[2] }}</text>
    <text :x="mL + bL + 4" :y="(mT + bT + (H - mB - bB)) / 2 + 3" font-size="9" fill="#14532d">{{ p[3] }}</text>

    <!-- content (innermost) -->
    <rect
      :x="mL + bL + pL"
      :y="mT + bT + pT"
      :width="Math.max(10, W - mL - mR - bL - bR - pL - pR)"
      :height="Math.max(10, H - mT - mB - bT - bB - pT - pB)"
      fill="#bfdbfe"
      stroke="#1e3a8a"
      stroke-width="1"
    />
    <text
      :x="W / 2"
      :y="(mT + bT + pT + (H - mB - bB - pB)) / 2 + 3"
      text-anchor="middle"
      font-size="10"
      fill="#0f172a"
      font-weight="600"
    >{{ contentLabel }}</text>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Session } from '@tw199501/specsnap-inspector-core';
type Frame = Session['frames'][number];

const props = defineProps<{ frame: Frame }>();

// Canvas size — wide enough for "1152×431" style label + per-side numbers.
const W = 240;
const H = 150;

// Each layer gets a fixed visual width so margin/border/padding are always
// distinguishable, even when their actual values are 0. The numeric label
// inside each layer carries the real value. This matches the reference design.
const LAYER = 18;
const mT = LAYER; const mR = LAYER; const mB = LAYER; const mL = LAYER;
const bT = LAYER; const bR = LAYER; const bB = LAYER; const bL = LAYER;
const pT = LAYER; const pR = LAYER; const pB = LAYER; const pL = LAYER;

const m = computed(() => props.frame.boxModel.margin.map(n => Math.round(n)));
const b = computed(() => props.frame.boxModel.border.map(n => Math.round(n)));
const p = computed(() => props.frame.boxModel.padding.map(n => Math.round(n)));

const contentLabel = computed(() => {
  const w = props.frame.boxModel.content.width;
  const h = props.frame.boxModel.content.height;
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(3));
  return `${fmt(w)}×${fmt(h)}`;
});
</script>
