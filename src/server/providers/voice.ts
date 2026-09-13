import type { VoiceProvider } from '@/domain/types';

/**
 * Resolve the configured voice provider in one place.
 * Provider-specific implementations must live behind this contract.
 */
export function getVoiceProvider(): VoiceProvider {
  throw new Error(
    'No voice provider configured. Set up a provider adapter before initiating real calls.'
  );
}
