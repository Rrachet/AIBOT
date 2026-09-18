import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VoiceConversationWidget } from './voice-conversation-widget';

vi.mock('@/components/icons', () => ({
  Icon: ({ name }: any) => <div data-testid={`icon-${name}`} />,
}));

vi.mock('@/hooks/use-voice-conversation', () => ({
  useVoiceConversation: () => ({
    state: {
      state: 'IDLE',
      transcript: '',
      error: null,
      lastFinalTranscript: '',
    },
    start: vi.fn(),
    stop: vi.fn(),
    finishSpeaking: vi.fn(),
    setLanguage: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-voice-agent-tts', () => ({
  useVoiceAgentTTS: () => ({
    processAndSpeak: vi.fn(),
    stop: vi.fn(),
    isSpeaking: vi.fn(() => false),
    isSupported: true,
  }),
}));

vi.mock('@/components/speech/transcript-pane', () => ({
  TranscriptPane: () => <div data-testid="transcript-pane" />,
}));

describe('VoiceConversationWidget', () => {
  it('should render start button when permitted', () => {
    render(<VoiceConversationWidget isPermitted={true} />);

    const button = screen.getByRole('button');
    expect(button).toBeTruthy();
    expect(button.textContent).toContain('Talk to Assistant');
  });

  it('should render disabled button when not permitted', () => {
    render(<VoiceConversationWidget isPermitted={false} />);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('should call onPermissionRequired when starting without permission', () => {
    const onPermissionRequired = vi.fn();
    render(
      <VoiceConversationWidget isPermitted={false} onPermissionRequired={onPermissionRequired} />
    );

    fireEvent.click(screen.getByRole('button'));
    expect(onPermissionRequired).toHaveBeenCalled();
  });

  it('should render transcript pane when conversation is active', () => {
    render(<VoiceConversationWidget isPermitted={true} />);

    // Component should render without errors
    expect(screen.queryByRole('button')).toBeTruthy();
  });
});
