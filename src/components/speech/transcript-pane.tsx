'use client';

import { useRef, useEffect } from 'react';
import { Icon } from '@/components/icons';
import styles from './transcript-pane.module.css';

export interface TranscriptPaneProps {
  /** Current interim transcript. */
  interimTranscript: string;
  /** Latest final transcript. */
  finalTranscript: string;
  /** Whether currently listening. */
  isListening: boolean;
  /** Whether to show as expanded. */
  expanded?: boolean;
  /** Callback when expand/collapse is toggled. */
  onToggle?: () => void;
}

/**
 * Pane that displays speech recognition transcripts.
 *
 * Shows interim results in real-time while the user is speaking, and commits
 * final results once speech ends. Defaults to collapsed for minimal UI clutter.
 * Mobile-optimized with responsive typography.
 */
export function TranscriptPane({
  interimTranscript,
  finalTranscript,
  isListening,
  expanded = false,
  onToggle,
}: TranscriptPaneProps) {
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest content
  useEffect(() => {
    if (transcriptRef.current && expanded) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [interimTranscript, finalTranscript, expanded]);

  // Don't render if no transcript and not listening
  if (!interimTranscript && !finalTranscript && !isListening) {
    return null;
  }

  const hasContent = !!interimTranscript || !!finalTranscript;

  return (
    <div className={styles.pane}>
      <button
        className={styles.header}
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={expanded ? 'Hide transcript' : 'Show transcript'}
      >
        <div className={styles.headerLabel}>
          <Icon name="download" size={16} />
          Transcript
          {isListening && <span className={styles.indicator} />}
        </div>
        <Icon
          name={expanded ? 'chevron-down' : 'arrowDown'}
          size={16}
          className={styles.chevron}
        />
      </button>

      {expanded && (
        <div className={styles.content}>
          <div ref={transcriptRef} className={styles.transcript}>
            {finalTranscript && <div className={styles.finalBlock}>{finalTranscript}</div>}
            {interimTranscript && (
              <div className={styles.interimBlock}>
                <span>{interimTranscript}</span>
                <span className={styles.cursor} />
              </div>
            )}
            {!hasContent && isListening && (
              <div className={styles.placeholder}>Listening...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
