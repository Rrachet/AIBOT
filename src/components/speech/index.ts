// Voice conversation state and lifecycle
export {
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
  type PermissionState,
  type ConversationState,
  type VoiceConversationState,
} from './voice-conversation-state';

// React hooks
export { useVoiceConversationState } from './use-voice-conversation-state';
export { useVoiceConversation, type ConversationPhase, type VoiceConversation } from './use-voice-conversation';

// UI components
export { MicrophonePermissionCard, type MicrophonePermissionCardProps } from './microphone-permission-card';

// Voice preview state
export {
  NO_VOICE_PREVIEW,
  VOICE_PREVIEW_EVENT,
  readVoicePreviewState,
  publishVoicePreviewState,
  clearVoicePreviewState,
  useVoicePreviewState,
  type VoicePreviewState,
} from './voice-preview-state';

// Types
export type { ConversationTurn } from './use-voice-conversation';
