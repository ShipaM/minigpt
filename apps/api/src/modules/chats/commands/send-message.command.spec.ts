import { BadGatewayException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatEntity } from '../chat.entity.ts';
import type { LlmProvider } from '../llm/llm-provider.ts';
import type { MessageEntity } from '../message.entity.ts';
import { SendMessageCommand, SendMessageHandler } from './send-message.command.ts';

const USER_ID = '3f9e1c3a-6a2b-4c1d-9a55-0d6f4b7b2a10';
const CHAT_ID = '8b1d2f44-0c3e-4f5a-8e21-6a7b9c0d1e2f';

// A handler is just a class: its dependencies are passed to the constructor, so it is tested
//in isolation, without Nest, HTTP or a database. This is one of the practical gains of CQRS.

describe('SendMessageHandler (no database, no HTTP)', () => {
  const chats = { existsBy: vi.fn(), update: vi.fn() };

  const messages = { create: vi.fn(), save: vi.fn(), find: vi.fn() };

  const llm = { complete: vi.fn() };

  const handler = () =>
    new SendMessageHandler(
      chats as unknown as Repository<ChatEntity>,
      messages as unknown as Repository<MessageEntity>,
      llm as unknown as LlmProvider,
    );

  const command = new SendMessageCommand(USER_ID, CHAT_ID, 'And what about Mars?');

  beforeEach(() => {
    vi.resetAllMocks();
    chats.existsBy.mockResolvedValue(true);
    messages.create.mockImplementation((data: object) => ({ ...data }));
    messages.save.mockImplementation(async (message: object) => ({ id: 'generated', ...message }));
    // The database returns the newest messages first.
    messages.find.mockResolvedValue([
      { role: 'user', content: 'And what about Mars?' },
      { role: 'assistant', content: 'Paris is the capital of France.' },
      { role: 'user', content: 'What is the capital of France?' },
    ]);
    llm.complete.mockResolvedValue('Mars has no capital.');
  });

  it('a foreign or missing chat is a 404: nothing is saved and the model is not called', async () => {
    chats.existsBy.mockResolvedValue(false);

    await expect(handler().execute(command)).rejects.toBeInstanceOf(NotFoundException);

    expect(chats.existsBy).toHaveBeenCalledWith({ id: CHAT_ID, userId: USER_ID });
    expect(messages.save).not.toHaveBeenCalled();
    expect(llm.complete).not.toHaveBeenCalled();
  });

  it('passes the history to the model oldest first, saves the answer and moves the chat up', async () => {
    const result = await handler().execute(command);

    expect(llm.complete).toHaveBeenCalledWith([
      { role: 'user', content: 'What is the capital of France?' },
      { role: 'assistant', content: 'Paris is the capital of France.' },
      { role: 'user', content: 'And what about Mars?' },
    ]);
    expect(result.userMessage).toMatchObject({
      chatId: CHAT_ID,
      role: 'user',
      content: 'And what about Mars?',
    });
    expect(result.assistantMessage).toMatchObject({
      chatId: CHAT_ID,
      role: 'assistant',
      content: 'Mars has no capital.',
    });
    expect(chats.update).toHaveBeenCalledTimes(1);
  });

  it('when the model fails: 502, the question stays saved, no answer is saved, the chat is not moved', async () => {
    llm.complete.mockRejectedValue(new Error('upstream timeout, api key sk-secret'));

    const failure = handler().execute(command);

    await expect(failure).rejects.toBeInstanceOf(BadGatewayException);

    await expect(failure).rejects.not.toThrow(/sk-secret/);

    expect(messages.save).toHaveBeenCalledTimes(1);
    expect(messages.save).toHaveBeenCalledWith(expect.objectContaining({ role: 'user' }));
    expect(chats.update).not.toHaveBeenCalled();
  });
});
