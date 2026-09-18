import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  IDLE_STATE,
  initializeVoiceState,
  requestMicrophonePermission,
  startListening,
  startRecording,
  startProcessing,
  startAISpeaking,
  returnToListening,
  idleAfterTimeout,
  setError,
  clearError,
  canVoiceInput,
  canTextInput,
  voiceAvailable,
  shouldShowPermissionCard,
  type VoiceConversationState,
} from './voice-conversation-state';

describe('VoiceConversationState', () => {
  describe('IDLE_STATE', () => {
    it('should have expected initial values', () => {
      expect(IDLE_STATE.permission).toBe('idle');
      expect(IDLE_STATE.conversation).toBe('idle');
      expect(IDLE_STATE.error).toBeNull();
      expect(IDLE_STATE.ttsSupported).toBe(true);
      expect(IDLE_STATE.sttSupported).toBe(true);
      expect(IDLE_STATE.permissionQuerySupported).toBe(true);
    });

    it('should be frozen', () => {
      expect(Object.isFrozen(IDLE_STATE)).toBe(true);
    });
  });

  describe('initializeVoiceState()', () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    it('should detect TTS support', async () => {
      const state = await initializeVoiceState();
      expect(state.ttsSupported).toBe(typeof window !== 'undefined' && !!window.speechSynthesis);
    });

    it('should detect STT support', async () => {
      const state = await initializeVoiceState();
      expect(state.sttSupported).toBe(
        typeof window !== 'undefined' &&
          (!!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition))
      );
    });

    it('should detect permission query support', async () => {
      const state = await initializeVoiceState();
      expect(state.permissionQuerySupported).toBe(
        typeof navigator !== 'undefined' && !!navigator.permissions?.query
      );
    });

    it('should set permission to denied if user previously denied', async () => {
      const mockPermissionStatus = {
        state: 'denied' as const,
        addEventListener: vi.fn(),
      };
      vi.spyOn(navigator.permissions, 'query').mockResolvedValue(mockPermissionStatus as any);

      const state = await initializeVoiceState();
      expect(state.permission).toBe('denied');
    });

    it('should set permission to granted if user previously granted', async () => {
      const mockPermissionStatus = {
        state: 'granted' as const,
        addEventListener: vi.fn(),
      };
      vi.spyOn(navigator.permissions, 'query').mockResolvedValue(mockPermissionStatus as any);

      const state = await initializeVoiceState();
      expect(state.permission).toBe('granted');
    });

    it('should handle permission query errors gracefully', async () => {
      vi.spyOn(navigator.permissions, 'query').mockRejectedValue(new Error('Test error'));

      const state = await initializeVoiceState();
      expect(state.permission).toBe('browser-error');
    });

    it('should set permission to unsupported if query not available', async () => {
      const originalQuery = navigator.permissions?.query;
      (navigator as any).permissions = undefined;

      const state = await initializeVoiceState();
      expect(state.permission).toBe('unsupported');

      if (originalQuery) {
        (navigator as any).permissions = { query: originalQuery };
      }
    });
  });

  describe('requestMicrophonePermission()', () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    it('should return unsupported if getUserMedia not available', async () => {
      const originalGetUserMedia = navigator.mediaDevices?.getUserMedia;
      (navigator as any).mediaDevices = undefined;

      const state = await requestMicrophonePermission();
      expect(state.permission).toBe('unsupported');
      expect(state.error).toContain('does not support microphone access');

      if (originalGetUserMedia) {
        (navigator as any).mediaDevices = { getUserMedia: originalGetUserMedia };
      }
    });

    it('should grant permission and transition to listening on success', async () => {
      const mockTrack = { stop: vi.fn() };
      const mockStream = { getTracks: () => [mockTrack] };
      vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockResolvedValue(mockStream as any);

      const state = await requestMicrophonePermission();
      expect(state.permission).toBe('granted');
      expect(state.conversation).toBe('listening');
      expect(state.error).toBeNull();
      expect(mockTrack.stop).toHaveBeenCalled();
    });

    it('should handle NotAllowedError (user denied)', async () => {
      const error = new DOMException('Permission denied', 'NotAllowedError');
      vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockRejectedValue(error);

      const state = await requestMicrophonePermission();
      expect(state.permission).toBe('denied');
      expect(state.error).toContain('Microphone access was denied');
    });

    it('should handle NotFoundError (no microphone)', async () => {
      const error = new DOMException('No microphone found', 'NotFoundError');
      vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockRejectedValue(error);

      const state = await requestMicrophonePermission();
      expect(state.permission).toBe('unsupported');
      expect(state.error).toContain('No microphone found');
    });

    it('should handle NotReadableError (microphone in use)', async () => {
      const error = new DOMException('Microphone is in use', 'NotReadableError');
      vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockRejectedValue(error);

      const state = await requestMicrophonePermission();
      expect(state.permission).toBe('browser-error');
      expect(state.error).toContain('already in use');
    });

    it('should handle generic errors', async () => {
      vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockRejectedValue(new Error('Unknown'));

      const state = await requestMicrophonePermission();
      expect(state.permission).toBe('browser-error');
      expect(state.error).toContain('unexpected error');
    });
  });

  describe('State transitions', () => {
    let granted: VoiceConversationState;

    beforeEach(() => {
      granted = { ...IDLE_STATE, permission: 'granted' };
    });

    describe('startListening()', () => {
      it('should transition from granted to listening', () => {
        const state = startListening(granted);
        expect(state.conversation).toBe('listening');
        expect(state.error).toBeNull();
      });

      it('should fail if permission not granted', () => {
        const state = startListening(IDLE_STATE);
        expect(state.conversation).toBe('idle');
        expect(state.error).toContain('not granted');
      });

      it('should be frozen', () => {
        const state = startListening(granted);
        expect(Object.isFrozen(state)).toBe(true);
      });
    });

    describe('startRecording()', () => {
      it('should transition from listening to recording', () => {
        const listening = startListening(granted);
        const state = startRecording(listening);
        expect(state.conversation).toBe('recording');
        expect(state.error).toBeNull();
      });

      it('should not transition if not in listening state', () => {
        const state = startRecording(granted);
        expect(state.conversation).toBe('granted');
      });
    });

    describe('startProcessing()', () => {
      it('should transition from recording to processing', () => {
        let state = startListening(granted);
        state = startRecording(state);
        state = startProcessing(state);
        expect(state.conversation).toBe('processing');
        expect(state.error).toBeNull();
      });

      it('should not transition if not in recording state', () => {
        const state = startProcessing(granted);
        expect(state.conversation).toBe('granted');
      });
    });

    describe('startAISpeaking()', () => {
      it('should transition from processing to ai-speaking', () => {
        let state = startListening(granted);
        state = startRecording(state);
        state = startProcessing(state);
        state = startAISpeaking(state);
        expect(state.conversation).toBe('ai-speaking');
        expect(state.error).toBeNull();
      });

      it('should not transition if not in processing state', () => {
        const state = startAISpeaking(granted);
        expect(state.conversation).toBe('granted');
      });
    });

    describe('returnToListening()', () => {
      it('should transition to listening if permission granted', () => {
        const state = returnToListening(granted);
        expect(state.conversation).toBe('listening');
        expect(state.error).toBeNull();
      });

      it('should transition to idle if permission not granted', () => {
        const state = returnToListening(IDLE_STATE);
        expect(state.conversation).toBe('idle');
      });
    });

    describe('idleAfterTimeout()', () => {
      it('should transition to idle', () => {
        const state = idleAfterTimeout(granted);
        expect(state.conversation).toBe('idle');
      });
    });

    describe('error handling', () => {
      it('setError() should set error and conversation state', () => {
        const state = setError(granted, 'Test error');
        expect(state.error).toBe('Test error');
        expect(state.conversation).toBe('error');
      });

      it('clearError() should clear error and return to listening if granted', () => {
        let state = setError(granted, 'Test error');
        state = clearError(state);
        expect(state.error).toBeNull();
        expect(state.conversation).toBe('listening');
      });

      it('clearError() should return to idle if permission not granted', () => {
        let state = setError(IDLE_STATE, 'Test error');
        state = clearError(state);
        expect(state.error).toBeNull();
        expect(state.conversation).toBe('idle');
      });

      it('clearError() should be no-op if no error', () => {
        const original = granted;
        const state = clearError(original);
        expect(state).toBe(original);
      });
    });
  });

  describe('Helper functions', () => {
    describe('canVoiceInput()', () => {
      it('should return true when all conditions met', () => {
        const state: VoiceConversationState = {
          ...IDLE_STATE,
          permission: 'granted',
          sttSupported: true,
          conversation: 'listening',
        };
        expect(canVoiceInput(state)).toBe(true);
      });

      it('should return false if permission not granted', () => {
        const state: VoiceConversationState = {
          ...IDLE_STATE,
          sttSupported: true,
          conversation: 'listening',
        };
        expect(canVoiceInput(state)).toBe(false);
      });

      it('should return false if STT not supported', () => {
        const state: VoiceConversationState = {
          ...IDLE_STATE,
          permission: 'granted',
          sttSupported: false,
          conversation: 'listening',
        };
        expect(canVoiceInput(state)).toBe(false);
      });

      it('should return false if not in listening state', () => {
        const state: VoiceConversationState = {
          ...IDLE_STATE,
          permission: 'granted',
          sttSupported: true,
          conversation: 'idle',
        };
        expect(canVoiceInput(state)).toBe(false);
      });
    });

    describe('canTextInput()', () => {
      it('should return true in idle state', () => {
        expect(canTextInput(IDLE_STATE)).toBe(true);
      });

      it('should return true in listening state', () => {
        const state: VoiceConversationState = {
          ...IDLE_STATE,
          conversation: 'listening',
        };
        expect(canTextInput(state)).toBe(true);
      });

      it('should return false in other states', () => {
        const states: VoiceConversationState[] = [
          { ...IDLE_STATE, conversation: 'recording' },
          { ...IDLE_STATE, conversation: 'processing' },
          { ...IDLE_STATE, conversation: 'ai-speaking' },
          { ...IDLE_STATE, conversation: 'error' },
        ];

        states.forEach((state) => {
          expect(canTextInput(state)).toBe(false);
        });
      });
    });

    describe('voiceAvailable()', () => {
      it('should return true when all conditions met', () => {
        const state: VoiceConversationState = {
          ...IDLE_STATE,
          permission: 'granted',
          sttSupported: true,
          ttsSupported: true,
        };
        expect(voiceAvailable(state)).toBe(true);
      });

      it('should return false if permission not granted', () => {
        const state: VoiceConversationState = {
          ...IDLE_STATE,
          sttSupported: true,
          ttsSupported: true,
        };
        expect(voiceAvailable(state)).toBe(false);
      });

      it('should return false if STT not supported', () => {
        const state: VoiceConversationState = {
          ...IDLE_STATE,
          permission: 'granted',
          sttSupported: false,
          ttsSupported: true,
        };
        expect(voiceAvailable(state)).toBe(false);
      });

      it('should return false if TTS not supported', () => {
        const state: VoiceConversationState = {
          ...IDLE_STATE,
          permission: 'granted',
          sttSupported: true,
          ttsSupported: false,
        };
        expect(voiceAvailable(state)).toBe(false);
      });
    });

    describe('shouldShowPermissionCard()', () => {
      it('should return true in initial state with support', () => {
        expect(shouldShowPermissionCard(IDLE_STATE)).toBe(true);
      });

      it('should return false if already granted', () => {
        const state: VoiceConversationState = {
          ...IDLE_STATE,
          permission: 'granted',
        };
        expect(shouldShowPermissionCard(state)).toBe(false);
      });

      it('should return false if already denied', () => {
        const state: VoiceConversationState = {
          ...IDLE_STATE,
          permission: 'denied',
        };
        expect(shouldShowPermissionCard(state)).toBe(false);
      });

      it('should return false if STT not supported', () => {
        const state: VoiceConversationState = {
          ...IDLE_STATE,
          sttSupported: false,
        };
        expect(shouldShowPermissionCard(state)).toBe(false);
      });

      it('should return false if TTS not supported', () => {
        const state: VoiceConversationState = {
          ...IDLE_STATE,
          ttsSupported: false,
        };
        expect(shouldShowPermissionCard(state)).toBe(false);
      });

      it('should return false if permission queries not supported', () => {
        const state: VoiceConversationState = {
          ...IDLE_STATE,
          permissionQuerySupported: false,
        };
        expect(shouldShowPermissionCard(state)).toBe(false);
      });
    });
  });

  describe('State immutability', () => {
    it('should never mutate input state', () => {
      const original = { ...IDLE_STATE, permission: 'granted' as const };
      const frozen = Object.freeze(original);

      const next = startListening(frozen);
      expect(frozen.conversation).toBe('idle');
      expect(next.conversation).toBe('listening');
    });

    it('all state transitions should return frozen objects', () => {
      const granted = Object.freeze({ ...IDLE_STATE, permission: 'granted' as const });

      const states = [
        startListening(granted),
        startRecording({ ...granted, conversation: 'listening' as const }),
        startProcessing({ ...granted, conversation: 'recording' as const }),
        startAISpeaking({ ...granted, conversation: 'processing' as const }),
        returnToListening(granted),
        idleAfterTimeout(granted),
        setError(granted, 'test'),
      ];

      states.forEach((state) => {
        expect(Object.isFrozen(state)).toBe(true);
      });
    });
  });
});
