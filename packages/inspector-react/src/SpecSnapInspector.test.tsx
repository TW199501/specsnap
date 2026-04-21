import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SpecSnapInspector } from './SpecSnapInspector.js';

describe('SpecSnapInspector (React) renders trigger by default', () => {
  it('renders the trigger button when no trigger prop is passed', () => {
    const { container } = render(<SpecSnapInspector />);
    const trigger = document.querySelector('.specsnap-inspector-trigger');
    expect(trigger).not.toBeNull();
    expect(trigger?.getAttribute('data-position')).toBe('bottom-right');
  });

  it('does NOT render the trigger when trigger={false}', () => {
    render(<SpecSnapInspector trigger={false} />);
    const trigger = document.querySelector('.specsnap-inspector-trigger');
    expect(trigger).toBeNull();
  });
});
