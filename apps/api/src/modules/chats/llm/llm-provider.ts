// One message of the conversation as the model sees it.
export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

// The port: the only thing the application knows about "the model".
// It is an abstract class (not an interface) so that it can also serve as the dependency injection token.
// A concrete provider (the mock now, a real model on day 5) is an adapter that implements it.

export abstract class LlmProvider {
  /** Takes the conversation (oldest first, ending with the user's message) and returns the reply text. */
  abstract complete(history: readonly ChatTurn[]): Promise<string>;
}
