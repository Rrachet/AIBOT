import type { VoiceProvider } from '@/domain/types';
import { DemoVoiceProvider } from './demo-voice';

/**
 * Resolve the configured voice provider in one place.
 *
 * With no provider configured AIBOT runs in demo mode: calls are simulated
 * locally and never dialled. That is the default deliberately, so the product
 * is usable and demonstrable before any telephony account exists, and so a
 * missing credential can never silently fall back to placing real calls.
 *
 * Setting VOICE_PROVIDER to anything other than 'demo' is an explicit request
 * for a real provider, and fails loudly until one is implemented.
 */
export function getVoiceProvider(): VoiceProvider {
  const configured = process.env.VOICE_PROVIDER?.trim().toLowerCase()

  if (!configured || configured === 'demo') return new DemoVoiceProvider();

  throw new Error(
    `Voice provider "${configured}" is not implemented. Unset VOICE_PROVIDER to run in demo mode.`
  );
}

/** True when calls are simulated rather than placed. */
export function isDemoVoice(): boolean {
  const configured = process.env.VOICE_PROVIDER?.trim().toLowerCase();
  return !configured || configured === 'demo';
}
