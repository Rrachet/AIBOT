import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TranscriptPane } from './transcript-pane';

vi.mock('@/components/icons', () => ({
  Icon: ({ name, size, className }: any) => (
    <div data-testid={`icon-${name}`} className={className} style={{ width: size, height: size }} />
  ),
}));

describe('TranscriptPane', () => {
  const defaultProps = {
    interimTranscript: '',
    finalTranscript: '',
    isListening: false,
    expanded: false,
  };

  it('should render when listening', () => {
    render(<TranscriptPane {...defaultProps} isListening={true} />);
    expect(screen.getByText('Transcript')).toBeTruthy();
  });

  it('should render with final transcript when expanded', () => {
    render(
      <TranscriptPane
        {...defaultProps}
        finalTranscript="Hello world"
        expanded={true}
      />
    );
    expect(screen.getByText('Hello world')).toBeTruthy();
  });

  it('should not render when no transcript and not listening', () => {
    const { container } = render(<TranscriptPane {...defaultProps} />);
    expect(container.firstChild).toBeNull();
  });

  it('should call onToggle when header is clicked', () => {
    const onToggle = vi.fn();
    render(
      <TranscriptPane
        {...defaultProps}
        finalTranscript="test"
        onToggle={onToggle}
        isListening={true}
      />
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalled();
  });

  it('should set aria-expanded attribute correctly', () => {
    const { rerender } = render(
      <TranscriptPane {...defaultProps} expanded={false} isListening={true} />
    );
    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-expanded')).toBe('false');

    rerender(<TranscriptPane {...defaultProps} expanded={true} isListening={true} />);
    expect(button.getAttribute('aria-expanded')).toBe('true');
  });

  it('should display interim transcript', () => {
    render(
      <TranscriptPane
        {...defaultProps}
        interimTranscript="Hello"
        expanded={true}
      />
    );
    expect(screen.getByText('Hello')).toBeTruthy();
  });

  it('should show content when expanded', () => {
    const { container } = render(
      <TranscriptPane
        {...defaultProps}
        finalTranscript="test"
        expanded={true}
      />
    );
    const content = container.querySelector('[class*="content"]');
    expect(content).toBeTruthy();
  });
});
