<template>
  <button
    type="button"
    class="specsnap-inspector-trigger"
    :data-position="position"
    aria-label="Open SpecSnap Inspector"
    @click="$emit('click')"
  >
    <slot>◎</slot>
  </button>
</template>

<script setup lang="ts">
import type { PanelPosition } from '@tw199501/specsnap-inspector-core';

defineProps<{
  position: PanelPosition;
}>();

defineEmits<{ click: [] }>();
</script>
