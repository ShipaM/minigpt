import { Injectable } from '@nestjs/common';
import { LlmProvider, type ChatTurn } from './llm-provider.ts';

// A stand-in for a real model: deterministic and instant, so tests never call the network.
@Injectable()
export class MockLlmProvider extends LlmProvider {
  async complete(history: readonly ChatTurn[]): Promise<string> {
    const last = history.at(-1);

    return last ? `Echo: ${last.content.slice(0, 500)}` : 'Echo: (empty conversation)';
  }
}
