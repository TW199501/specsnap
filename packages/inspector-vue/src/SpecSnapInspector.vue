<template>
  <TriggerButton
    v-if="showTrigger && !snapshot.visible"
    :position="resolvedPosition"
    @click="handle.toggle()"
  />

  <Teleport to="body">
    <Panel
      v-if="snapshot.visible"
      :snapshot="snapshot"
      :position="resolvedPosition"
      :title="resolvedTitle"
      @close="handle.close()"
      @toggle-picker="togglePicker"
      @clear="handle.clearFrames()"
      @copy="onCopyClick"
    />
  </Teleport>
</template>

<script setup lang="ts">
import { watch, computed } from 'vue';
import TriggerButton from './TriggerButton.vue';
import Panel from './Panel.vue';
import { useInspector } from './use-inspector.js';
import type {
  PanelPosition,
  InspectorOptions,
  InspectorHandle,
  SpecSnapBundle,
  Session
} from '@tw199501/specsnap-inspector-core';

const props = withDefaults(defineProps<{
  scope?: InspectorOptions['scope'];
  position?: PanelPosition;
  trigger?: boolean;
  panelTitle?: string;
  onSave?: (bundle: SpecSnapBundle) => void | Promise<void>;
}>(), {
  position: 'bottom-right',
  trigger: true,
  panelTitle: 'SpecSnap Inspector'
});

// With withDefaults, Vue gives these props their defaults at runtime.
// We still narrow the types via computed wrappers so the template bindings
// compile cleanly under vue-tsc (which doesn't always see through withDefaults).
const resolvedPosition = computed<PanelPosition>(() => (props.position ?? 'bottom-right') as PanelPosition);
const resolvedTitle = computed<string>(() => (props.panelTitle ?? 'SpecSnap Inspector'));
const showTrigger = computed<boolean>(() => props.trigger);

const emit = defineEmits<{
  save: [SpecSnapBundle];
  copy: [string];
  capture: [{ frameIndex: number; session: Session }];
  clear: [];
  open: [];
  close: [];
}>();

const inspectorOptions: InspectorOptions = {
  position: resolvedPosition.value,
  trigger: showTrigger.value,
  panelTitle: resolvedTitle.value,
  onCopy: (md) => emit('copy', md),
  onCapture: (payload) => emit('capture', payload),
  onClear: () => emit('clear'),
  onOpen: () => emit('open'),
  onClose: () => emit('close')
};
if (props.scope !== undefined) inspectorOptions.scope = props.scope;
if (props.onSave) inspectorOptions.onSave = props.onSave;

const { snapshot, handle } = useInspector(inspectorOptions);

watch(() => snapshot.value.picking, (on) => {
  document.body.classList.toggle('specsnap-inspecting', on);
});

function togglePicker(): void {
  if (snapshot.value.picking) handle.stopPicker();
  else handle.startPicker();
}

async function onCopyClick(): Promise<void> {
  // Stop picker before save — fs-access can fall back to `<a download>`
  // clicks which, while picker is active, would otherwise be captured as
  // stray frames during the save flow.
  handle.stopPicker();
  await handle.copyMarkdown();
  await handle.saveBundle();
}

defineExpose({
  open: () => handle.open(),
  close: () => handle.close(),
  toggle: () => handle.toggle(),
  startPicker: () => handle.startPicker(),
  stopPicker: () => handle.stopPicker(),
  clearFrames: () => handle.clearFrames(),
  getSnapshot: () => handle.getSnapshot(),
  handle: handle as InspectorHandle
});
</script>
