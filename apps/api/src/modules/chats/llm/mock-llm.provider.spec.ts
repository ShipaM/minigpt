import { describe, expect, it } from 'vitest';
import { MockLlmProvider } from './mock-llm.provider.ts';

describe('MockLlmProvider', () => {
  const llm = new MockLlmProvider();

  it('echoes the last message', async () => {
    const reply = await llm.complete([
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi!' },
      { role: 'user', content: 'How are you?' },
    ]);
    expect(reply).toBe('Echo: How are you?');
  });

  it('is deterministic and shortens very long messages', async () => {
    const long = 'a'.repeat(2000);
    const first = await llm.complete([{ role: 'user', content: long }]);
    const second = await llm.complete([{ role: 'user', content: long }]);
    expect(first).toBe(second);
    expect(first.length).toBe('Echo: '.length + 500);
  });

  it('copes with an empty conversation', async () => {
    expect(await llm.complete([])).toBe('Echo: (empty conversation)');
  });
});
