import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MicrophonePermissionCard } from './microphone-permission-card';

describe('MicrophonePermissionCard', () => {
  it('should render heading and description', () => {
    const handleEnable = vi.fn();
    const handleTextOnly = vi.fn();

    render(
      <MicrophonePermissionCard
        onEnable={handleEnable}
        onTextOnly={handleTextOnly}
      />
    );

    expect(screen.getByText('Enable voice conversation?')).toBeInTheDocument();
    expect(screen.getByText(/listen to you and respond with speech/i)).toBeInTheDocument();
  });

  it('should render privacy explanations', () => {
    const handleEnable = vi.fn();
    const handleTextOnly = vi.fn();

    render(
      <MicrophonePermissionCard
        onEnable={handleEnable}
        onTextOnly={handleTextOnly}
      />
    );

    expect(screen.getByText(/processed locally in your browser/i)).toBeInTheDocument();
    expect(screen.getByText(/No recordings are stored/i)).toBeInTheDocument();
    expect(screen.getByText(/switch to text input at any time/i)).toBeInTheDocument();
  });

  it('should render two buttons', () => {
    const handleEnable = vi.fn();
    const handleTextOnly = vi.fn();

    render(
      <MicrophonePermissionCard
        onEnable={handleEnable}
        onTextOnly={handleTextOnly}
      />
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
    expect(screen.getByText(/Enable microphone/i)).toBeInTheDocument();
    expect(screen.getByText(/Use text instead/i)).toBeInTheDocument();
  });

  it('should call onEnable when enable button clicked', async () => {
    const handleEnable = vi.fn().mockResolvedValue(undefined);
    const handleTextOnly = vi.fn();

    render(
      <MicrophonePermissionCard
        onEnable={handleEnable}
        onTextOnly={handleTextOnly}
      />
    );

    const enableButton = screen.getByText(/Enable microphone/i);
    await userEvent.click(enableButton);

    await waitFor(() => {
      expect(handleEnable).toHaveBeenCalledTimes(1);
    });
  });

  it('should call onTextOnly when text button clicked', async () => {
    const handleEnable = vi.fn();
    const handleTextOnly = vi.fn();

    render(
      <MicrophonePermissionCard
        onEnable={handleEnable}
        onTextOnly={handleTextOnly}
      />
    );

    const textButton = screen.getByText(/Use text instead/i);
    await userEvent.click(textButton);

    expect(handleTextOnly).toHaveBeenCalledTimes(1);
  });

  it('should show loading state while requesting', async () => {
    const handleEnable = vi.fn(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );
    const handleTextOnly = vi.fn();

    render(
      <MicrophonePermissionCard
        onEnable={handleEnable}
        onTextOnly={handleTextOnly}
      />
    );

    const enableButton = screen.getByText(/Enable microphone/i);
    await userEvent.click(enableButton);

    expect(screen.getByText(/Requesting permission/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText(/Requesting permission/i)).not.toBeInTheDocument();
    });
  });

  it('should disable buttons while loading', async () => {
    const handleEnable = vi.fn(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );
    const handleTextOnly = vi.fn();

    render(
      <MicrophonePermissionCard
        onEnable={handleEnable}
        onTextOnly={handleTextOnly}
        isLoading={true}
      />
    );

    const buttons = screen.getAllByRole('button');
    buttons.forEach((button: HTMLElement) => {
      expect(button).toBeDisabled();
    });
  });

  it('should display error message when provided', () => {
    const handleEnable = vi.fn();
    const handleTextOnly = vi.fn();
    const errorMsg = 'Microphone access was denied';

    render(
      <MicrophonePermissionCard
        onEnable={handleEnable}
        onTextOnly={handleTextOnly}
        error={errorMsg}
      />
    );

    expect(screen.getByText(errorMsg)).toBeInTheDocument();
  });

  it('should handle enable callback errors gracefully', async () => {
    const handleEnable = vi.fn().mockRejectedValue(new Error('Permission denied'));
    const handleTextOnly = vi.fn();

    render(
      <MicrophonePermissionCard
        onEnable={handleEnable}
        onTextOnly={handleTextOnly}
      />
    );

    const enableButton = screen.getByText(/Enable microphone/i);
    await userEvent.click(enableButton);

    await waitFor(() => {
      expect(handleEnable).toHaveBeenCalled();
    });
  });

  it('should not disable buttons when isLoading is false', () => {
    const handleEnable = vi.fn();
    const handleTextOnly = vi.fn();

    render(
      <MicrophonePermissionCard
        onEnable={handleEnable}
        onTextOnly={handleTextOnly}
        isLoading={false}
      />
    );

    const buttons = screen.getAllByRole('button');
    buttons.forEach((button: HTMLElement) => {
      expect(button).not.toBeDisabled();
    });
  });

  it('should render microphone icon', () => {
    const handleEnable = vi.fn();
    const handleTextOnly = vi.fn();

    render(
      <MicrophonePermissionCard
        onEnable={handleEnable}
        onTextOnly={handleTextOnly}
      />
    );

    // Icon component renders with specific data attributes
    const icons = screen.getAllByRole('img', { hidden: true });
    expect(icons.length).toBeGreaterThan(0);
  });
});
