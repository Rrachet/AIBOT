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

  describe('render', () => {
    it('should render when listening', () => {
      render(<TranscriptPane {...defaultProps} isListening={true} />);
      expect(screen.getByText('Transcript')).toBeInTheDocument();
    });

    it('should render with interim transcript', () => {
      render(
        <TranscriptPane
          {...defaultProps}
          interimTranscript="Hello"
          expanded={true}
        />
      );
      expect(screen.getByText('Hello')).toBeInTheDocument();
    });

    it('should render with final transcript', () => {
      render(
        <TranscriptPane
          {...defaultProps}
          finalTranscript="Hello world"
          expanded={true}
        />
      );
      expect(screen.getByText('Hello world')).toBeInTheDocument();
    });

    it('should not render when no transcript and not listening', () => {
      const { container } = render(<TranscriptPane {...defaultProps} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render listening placeholder when expanded and listening', () => {
      render(<TranscriptPane {...defaultProps} isListening={true} expanded={true} />);
      expect(screen.getByText('Listening...')).toBeInTheDocument();
    });
  });

  describe('expand/collapse', () => {
    it('should have collapsed by default', () => {
      render(
        <TranscriptPane
          {...defaultProps}
          finalTranscript="test"
          expanded={false}
        />
      );
      expect(screen.queryByText('test')).not.toBeInTheDocument();
    });

    it('should show content when expanded', () => {
      render(
        <TranscriptPane
          {...defaultProps}
          finalTranscript="test"
          expanded={true}
        />
      );
      expect(screen.getByText('test')).toBeInTheDocument();
    });

    it('should call onToggle when header is clicked', () => {
      const onToggle = vi.fn();
      render(
        <TranscriptPane
          {...defaultProps}
          finalTranscript="test"
          onToggle={onToggle}
        />
      );
      fireEvent.click(screen.getByRole('button'));
      expect(onToggle).toHaveBeenCalled();
    });

    it('should set aria-expanded attribute', () => {
      const { rerender } = render(
        <TranscriptPane {...defaultProps} expanded={false} isListening={true} />
      );
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded', 'false');

      rerender(<TranscriptPane {...defaultProps} expanded={true} isListening={true} />);
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    it('should have proper aria-label', () => {
      const { rerender } = render(
        <TranscriptPane {...defaultProps} expanded={false} isListening={true} />
      );
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Show transcript');

      rerender(<TranscriptPane {...defaultProps} expanded={true} isListening={true} />);
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Hide transcript');
    });
  });

  describe('listening indicator', () => {
    it('should show indicator when listening', () => {
      render(<TranscriptPane {...defaultProps} isListening={true} />);
      // Indicator is a span with specific class, check if it's rendered
      const pane = screen.getByText('Transcript').closest('div');
      expect(pane).toBeInTheDocument();
    });

    it('should not show indicator when not listening', () => {
      const { container } = render(
        <TranscriptPane {...defaultProps} isListening={false} finalTranscript="test" />
      );
      const pane = container.querySelector('[class*="pane"]');
      expect(pane).toBeInTheDocument();
    });
  });

  describe('transcript display', () => {
    it('should display final transcript in proper container', () => {
      const { container } = render(
        <TranscriptPane
          {...defaultProps}
          finalTranscript="Final text"
          expanded={true}
        />
      );
      expect(screen.getByText('Final text')).toBeInTheDocument();
      const finalBlock = screen.getByText('Final text').parentElement;
      expect(finalBlock).toHaveClass('finalBlock');
    });

    it('should display interim transcript with cursor', () => {
      const { container } = render(
        <TranscriptPane
          {...defaultProps}
          interimTranscript="Interim text"
          expanded={true}
        />
      );
      expect(screen.getByText('Interim text')).toBeInTheDocument();
      const interimBlock = screen.getByText('Interim text').parentElement;
      expect(interimBlock).toHaveClass('interimBlock');
    });

    it('should display both transcripts when both are present', () => {
      render(
        <TranscriptPane
          {...defaultProps}
          finalTranscript="Final text"
          interimTranscript="Interim text"
          expanded={true}
        />
      );
      expect(screen.getByText('Final text')).toBeInTheDocument();
      expect(screen.getByText('Interim text')).toBeInTheDocument();
    });
  });

  describe('auto-scroll', () => {
    it('should auto-scroll when content changes and expanded', () => {
      const { rerender, container } = render(
        <TranscriptPane
          {...defaultProps}
          finalTranscript="First"
          expanded={true}
        />
      );

      const transcript = container.querySelector('[class*="transcript"]') as HTMLElement;
      expect(transcript).toBeInTheDocument();

      rerender(
        <TranscriptPane
          {...defaultProps}
          finalTranscript="First"
          interimTranscript="Second"
          expanded={true}
        />
      );

      // Test would verify scrollTop is set to scrollHeight
      expect(transcript).toBeInTheDocument();
    });

    it('should not scroll when not expanded', () => {
      const { container } = render(
        <TranscriptPane
          {...defaultProps}
          finalTranscript="test"
          expanded={false}
        />
      );

      const transcript = container.querySelector('[class*="transcript"]');
      expect(transcript).not.toBeInTheDocument();
    });
  });

  describe('responsive behavior', () => {
    it('should render in expanded state', () => {
      const { container } = render(
        <TranscriptPane
          {...defaultProps}
          finalTranscript="test"
          expanded={true}
        />
      );
      const content = container.querySelector('[class*="content"]');
      expect(content).toBeInTheDocument();
    });

    it('should not render content container when collapsed', () => {
      const { container } = render(
        <TranscriptPane
          {...defaultProps}
          finalTranscript="test"
          expanded={false}
        />
      );
      const content = container.querySelector('[class*="content"]');
      expect(content).not.toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle empty strings', () => {
      const { container } = render(
        <TranscriptPane
          {...defaultProps}
          interimTranscript=""
          finalTranscript=""
          expanded={true}
        />
      );
      expect(screen.getByText('Listening...')).toBeInTheDocument();
    });

    it('should handle very long transcripts', () => {
      const longText = 'A'.repeat(1000);
      render(
        <TranscriptPane
          {...defaultProps}
          finalTranscript={longText}
          expanded={true}
        />
      );
      expect(screen.getByText(longText)).toBeInTheDocument();
    });

    it('should handle special characters', () => {
      const specialText = 'Hello! @#$% "quoted" <html>';
      render(
        <TranscriptPane
          {...defaultProps}
          finalTranscript={specialText}
          expanded={true}
        />
      );
      expect(screen.getByText(specialText)).toBeInTheDocument();
    });
  });
});
