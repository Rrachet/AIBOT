import { describe, it, expect } from 'vitest';
import { VoiceAgent } from './voice-agent';

describe('VoiceAgent', () => {
  it('should process input and return response', async () => {
    const agent = new VoiceAgent();
    const response = await agent.processInput('test input');

    expect(response).toBeDefined();
    expect(response.text).toBeDefined();
    expect(response.source).toBe('voice');
  });

  it('should include source: voice in response', async () => {
    const agent = new VoiceAgent();
    const response = await agent.processInput('hello');

    expect(response.source).toBe('voice');
  });

  it('should handle different inputs', async () => {
    const agent = new VoiceAgent();

    const response1 = await agent.processInput('show my leads');
    const response2 = await agent.processInput('filter by status');

    expect(response1.text).toBeDefined();
    expect(response2.text).toBeDefined();
    expect(response1.text).not.toBe(response2.text);
  });

  it('should not throw on empty input', async () => {
    const agent = new VoiceAgent();

    expect(async () => {
      await agent.processInput('');
    }).not.toThrow();
  });

  it('should handle long inputs', async () => {
    const agent = new VoiceAgent();
    const longInput = 'a'.repeat(1000);

    expect(async () => {
      await agent.processInput(longInput);
    }).not.toThrow();
  });
});
