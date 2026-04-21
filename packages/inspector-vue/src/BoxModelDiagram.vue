<template>
  <svg :width="W" :height="H" class="specsnap-inspector-bmdiag">
    <!-- margin -->
    <rect :x="0" :y="0" :width="W" :height="H" fill="#e9d8a6" rx="4" />
    <!-- border -->
    <rect :x="mL" :y="mT" :width="W - mL - mR" :height="H - mT - mB" fill="#d4a373" rx="3" />
    <!-- padding -->
    <rect :x="mL + bL" :y="mT + bT" :width="W - mL - mR - bL - bR" :height="H - mT - mB - bT - bB" fill="#a7c957" rx="2" />
    <!-- content -->
    <rect :x="mL + bL + pL" :y="mT + bT + pT" :width="W - mL - mR - bL - bR - pL - pR" :height="H - mT - mB - bT - bB - pT - pB" fill="#7fb3d5" />

    <!-- labels: margin/border/padding/content with numeric values (top side only for brevity) -->
    <text :x="W / 2" :y="6" text-anchor="middle" font-size="8" fill="#000">{{ frame.boxModel.margin[0] }}</text>
    <text :x="W / 2" :y="mT + 8" text-anchor="middle" font-size="8" fill="#000">{{ frame.boxModel.border[0] }}</text>
    <text :x="W / 2" :y="mT + bT + 8" text-anchor="middle" font-size="8" fill="#000">{{ frame.boxModel.padding[0] }}</text>
    <text :x="W / 2" :y="H / 2 + 3" text-anchor="middle" font-size="9" fill="#000" font-weight="600">
      {{ Math.round(frame.boxModel.content.width) }}×{{ Math.round(frame.boxModel.content.height) }}
    </text>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Session } from '@tw199501/specsnap-inspector-core';
type Frame = Session['frames'][number];

const props = defineProps<{ frame: Frame }>();

// Canvas size for the diagram
const W = 170;
const H = 70;

// Non-negative rounded scalers — cap so huge margins don't blow the diagram out.
const cap = (n: number) => Math.min(14, Math.max(0, Math.round(n / 2)));
const mT = computed(() => cap(props.frame.boxModel.margin[0]));
const mR = computed(() => cap(props.frame.boxModel.margin[1]));
const mB = computed(() => cap(props.frame.boxModel.margin[2]));
const mL = computed(() => cap(props.frame.boxModel.margin[3]));
const bT = computed(() => cap(props.frame.boxModel.border[0]));
const bR = computed(() => cap(props.frame.boxModel.border[1]));
const bB = computed(() => cap(props.frame.boxModel.border[2]));
const bL = computed(() => cap(props.frame.boxModel.border[3]));
const pT = computed(() => cap(props.frame.boxModel.padding[0]));
const pR = computed(() => cap(props.frame.boxModel.padding[1]));
const pB = computed(() => cap(props.frame.boxModel.padding[2]));
const pL = computed(() => cap(props.frame.boxModel.padding[3]));
</script>
