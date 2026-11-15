import { BadGatewayException, Logger } from '@nestjs/common';
import { Command, CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatEntity } from '../chat.entity.ts';
import { chatNotFound } from '../chat-errors.ts';
import { LlmProvider } from '../llm/llm-provider.ts';
import { MessageEntity } from '../message.entity.ts';

/** How many of the latest messages are sent to the model as context. */
const HISTORY_LIMIT = 20;

export interface MessagePair {
  userMessage: MessageEntity;
  assistantMessage: MessageEntity;
}

export class SendMessageCommand extends Command<MessagePair> {
  constructor(
    public readonly userId: string,
    public readonly chatId: string,
    public readonly content: string,
  ) {
    super();
  }
}

@CommandHandler(SendMessageCommand)
export class SendMessageHandler implements ICommandHandler<SendMessageCommand> {
  private readonly logger = new Logger(SendMessageHandler.name);
  constructor(
    @InjectRepository(ChatEntity)
    private readonly chats: Repository<ChatEntity>,
    @InjectRepository(MessageEntity)
    private readonly messages: Repository<MessageEntity>,
    private readonly llm: LlmProvider,
  ) {}

  async execute({ userId, chatId, content }: SendMessageCommand): Promise<MessagePair> {
    // 1. The chat must be the caller's. The owner is part of the condition, as in the other handlers.
    if (!(await this.chats.existsBy({ id: chatId, userId }))) throw chatNotFound();

    // 2. Save the question first: it must not be lost if the model fails.
    const userMessage = await this.messages.save(
      this.messages.create({ chatId, role: 'user', content }),
    );

    // 3. Context for the model: the latest messages, oldest first (the new question is the last one).
    const latest = await this.messages.find({
      where: { chatId },
      order: { seq: 'DESC' },
      take: HISTORY_LIMIT,
    });

    const history = latest.reverse().map(({ role, content: text }) => ({ role, content: text }));
    // 4. Ask the model. This is slow and external, so no database transaction is held open meanwhile.
    let reply: string;
    try {
      reply = await this.llm.complete(history);
    } catch (error) {
      this.logger.error(
        `The model failed for chat ${chatId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new BadGatewayException('The model is unavailable, please try again');
    }

    // 5. Save the answer and move the chat to the top of the list.
    const assistantMessage = await this.messages.save(
      this.messages.create({ chatId, role: 'assistant', content: reply }),
    );

    await this.chats.update({ id: chatId }, { updatedAt: () => 'now()' });

    return { userMessage, assistantMessage };
  }
}
