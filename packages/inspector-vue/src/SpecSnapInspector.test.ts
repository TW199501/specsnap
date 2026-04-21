import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import SpecSnapInspector from './SpecSnapInspector.vue';

describe('SpecSnapInspector renders trigger by default', () => {
  it('mounts without error', () => {
    const wrapper = mount(SpecSnapInspector);
    // log the rendered HTML so we can see what's actually output
    // eslint-disable-next-line no-console
    console.log('---rendered HTML---\n' + wrapper.html());
    // eslint-disable-next-line no-console
    console.log('---body HTML---\n' + document.body.innerHTML);
    wrapper.unmount();
  });

  it('renders the trigger button', () => {
    const wrapper = mount(SpecSnapInspector, { attachTo: document.body });
    const trigger = wrapper.find('.specsnap-inspector-trigger');
    expect(trigger.exists()).toBe(true);
    wrapper.unmount();
  });
});
