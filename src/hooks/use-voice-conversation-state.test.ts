import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVoiceConversationState } from './use-voice-conversation-state';

describe('useVoiceConversationState', () => {
  it('should initialize in IDLE state', () => {
    const { result } = renderHook(() => useVoiceConversationState());

    expect(result.current.context.state).toBe('IDLE');
    expect(result.current.context.transcript).toBe('');
    expect(result.current.context.error).toBeNull();
  });

  it('should transition IDLE → LISTENING', () => {
    const { result } = renderHook(() => useVoiceConversationState());

    act(() => {
      result.current.startListening();
    });

    expect(result.current.context.state).toBe('LISTENING');
  });

  it('should transition LISTENING → RECORDING', () => {
    const { result } = renderHook(() => useVoiceConversationState());

    act(() => {
      result.current.startListening();
      result.current.startRecording();
    });

    expect(result.current.context.state).toBe('RECORDING');
  });

  it('should update transcript while recording', () => {
    const { result } = renderHook(() => useVoiceConversationState());

    act(() => {
      result.current.startListening();
      result.current.startRecording();
      result.current.updateTranscript('hello world');
    });

    expect(result.current.context.transcript).toBe('hello world');
  });

  it('should transition RECORDING → PROCESSING with final transcript', () => {
    const { result } = renderHook(() => useVoiceConversationState());

    act(() => {
      result.current.startListening();
      result.current.startRecording();
      result.current.finishRecording('final text');
    });

    expect(result.current.context.state).toBe('PROCESSING');
    expect(result.current.context.transcript).toBe('final text');
    expect(result.current.context.lastFinalTranscript).toBe('final text');
  });

  it('should transition PROCESSING → AI_SPEAKING', () => {
    const { result } = renderHook(() => useVoiceConversationState());

    act(() => {
      result.current.startListening();
      result.current.startRecording();
      result.current.finishRecording('test');
      result.current.startAISpeaking();
    });

    expect(result.current.context.state).toBe('AI_SPEAKING');
  });

  it('should transition AI_SPEAKING → LISTENING', () => {
    const { result } = renderHook(() => useVoiceConversationState());

    act(() => {
      result.current.startListening();
      result.current.startRecording();
      result.current.finishRecording('test');
      result.current.startAISpeaking();
      result.current.finishSpeaking();
    });

    expect(result.current.context.state).toBe('LISTENING');
    expect(result.current.context.transcript).toBe('');
  });

  it('should handle error state', () => {
    const { result } = renderHook(() => useVoiceConversationState());

    act(() => {
      result.current.setError('Connection failed');
    });

    expect(result.current.context.state).toBe('ERROR');
    expect(result.current.context.error).toBe('Connection failed');
  });

  it('should reset to IDLE', () => {
    const { result } = renderHook(() => useVoiceConversationState());

    act(() => {
      result.current.startListening();
      result.current.startRecording();
      result.current.updateTranscript('some text');
      result.current.reset();
    });

    expect(result.current.context.state).toBe('IDLE');
    expect(result.current.context.transcript).toBe('');
    expect(result.current.context.error).toBeNull();
  });

  it('should not allow invalid transitions', () => {
    const { result } = renderHook(() => useVoiceConversationState());

    act(() => {
      result.current.startListening();
    });

    // Try to update transcript in LISTENING state (should not work)
    act(() => {
      result.current.updateTranscript('test');
    });

    expect(result.current.context.transcript).toBe('');
  });
});
