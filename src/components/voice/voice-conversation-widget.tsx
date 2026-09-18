'use client';

import { useEffect, useState } from 'react';
import { useVoiceConversation } from '@/hooks/use-voice-conversation';
import { useVoiceAgentTTS } from '@/hooks/use-voice-agent-tts';
import { TranscriptPane } from '@/components/speech/transcript-pane';
import styles from './voice-conversation-widget.module.css';

export interface VoiceConversationWidgetProps {
  isPermitted: boolean;
  onPermissionRequired?: () => void;
}

export function VoiceConversationWidget({
  isPermitted,
  onPermissionRequired,
}: VoiceConversationWidgetProps) {
  const [response, setResponse] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);

  const agentTTS = useVoiceAgentTTS({
    onResponse: setResponse,
    onSpeaking: () => setIsSpeaking(true),
    onError: (error) => {
      console.error('Voice agent error:', error);
      voice.state.state === 'ERROR' && voice.state.error !== error && setError(error);
    },
  });

  const [expanded, setExpanded] = useState(false);

  const voice = useVoiceConversation(
    {
      onFinalTranscript: async (transcript) => {
        voice.state.state === 'PROCESSING' && (await agentTTS.processAndSpeak(transcript));
      },
    },
    'ENGLISH'
  );

  // Handle finish speaking and auto-resume listening
  useEffect(() => {
    if (isSpeaking && !agentTTS.isSpeaking()) {
      setIsSpeaking(false);
      if (voice.state.state === 'AI_SPEAKING') {
        voice.finishSpeaking();
      }
    }
  }, [isSpeaking, agentTTS, voice]);

  const handleStart = () => {
    if (!isPermitted) {
      onPermissionRequired?.();
      return;
    }
    voice.start();
    setResponse('');
    setExpanded(true);
  };

  const handleStop = () => {
    voice.stop();
    agentTTS.stop();
    setResponse('');
    setExpanded(false);
  };

  const getStatusIndicator = () => {
    switch (voice.state.state) {
      case 'LISTENING':
        return '🎤 Listening...';
      case 'RECORDING':
        return '🔴 Recording...';
      case 'PROCESSING':
        return '⚙️ Processing...';
      case 'AI_SPEAKING':
        return '🔊 Speaking...';
      case 'ERROR':
        return `❌ Error: ${voice.state.error}`;
      default:
        return 'Talk to Assistant';
    }
  };

  const isConversationActive = voice.state.state !== 'IDLE' && voice.state.state !== 'ERROR';

  return (
    <div className={styles.widget}>
      <div className={styles.controls}>
        {!isConversationActive ? (
          <button
            className={styles.startButton}
            onClick={handleStart}
            disabled={!isPermitted}
            title={!isPermitted ? 'Microphone permission required' : 'Start voice conversation'}
          >
            {getStatusIndicator()}
          </button>
        ) : (
          <button className={styles.stopButton} onClick={handleStop}>
            Stop Conversation
          </button>
        )}
      </div>

      {isConversationActive && (
        <TranscriptPane
          interimTranscript={voice.state.transcript}
          finalTranscript={response}
          isListening={voice.state.state === 'LISTENING' || voice.state.state === 'RECORDING'}
          expanded={expanded}
          onToggle={() => setExpanded(!expanded)}
        />
      )}
    </div>
  );
}
