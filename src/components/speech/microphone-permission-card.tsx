'use client';

import { useCallback, useState } from 'react';
import { Icon } from '@/components/icons';
import styles from './microphone-permission-card.module.css';

export interface MicrophonePermissionCardProps {
  /** Callback when user chooses to enable microphone. */
  onEnable: () => Promise<void>;
  /** Callback when user chooses text-only mode. */
  onTextOnly: () => void;
  /** Whether the request is in progress. */
  isLoading?: boolean;
  /** Error message to display, if any. */
  error?: string | null;
}

/**
 * Card requesting explicit microphone permission for voice conversation.
 *
 * Explains what we're doing with the microphone, provides privacy assurance,
 * and offers two paths: enable microphone or use text input instead.
 * This card should only be shown once, on initial preview load or when the
 * user explicitly chooses to enable voice.
 */
export function MicrophonePermissionCard({
  onEnable,
  onTextOnly,
  isLoading = false,
  error = null,
}: MicrophonePermissionCardProps) {
  const [isRequesting, setIsRequesting] = useState(false);

  const handleEnable = useCallback(async () => {
    setIsRequesting(true);
    try {
      await onEnable();
    } finally {
      setIsRequesting(false);
    }
  }, [onEnable]);

  const disabled = isLoading || isRequesting;

  return (
    <div className={styles.card}>
      <div className={styles.content}>
        <div className={styles.icon}>
          <Icon name="bell" size={24} />
        </div>

        <h2 className={styles.heading}>Enable voice conversation?</h2>

        <p className={styles.description}>
          AIBOT can listen to you and respond with speech. This lets you have a natural
          two-way conversation with the AI.
        </p>

        <div className={styles.privacy}>
          <p className={styles.privacyTitle}>Privacy & Data</p>
          <ul className={styles.privacyList}>
            <li>Your audio is processed locally in your browser</li>
            <li>No recordings are stored or sent to servers</li>
            <li>Your conversation text is processed according to our privacy policy</li>
            <li>You can switch to text input at any time</li>
          </ul>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.actions}>
          <button
            className={styles.buttonPrimary}
            onClick={handleEnable}
            disabled={disabled}
            aria-busy={isRequesting}
          >
            {isRequesting ? (
              <>
                <Icon name="refresh" size={16} className={styles.spinner} />
                Requesting permission...
              </>
            ) : (
              <>
                <Icon name="bot" size={16} />
                Enable microphone
              </>
            )}
          </button>

          <button
            className={styles.buttonSecondary}
            onClick={onTextOnly}
            disabled={disabled}
            type="button"
          >
            Use text instead
          </button>
        </div>
      </div>
    </div>
  );
}
