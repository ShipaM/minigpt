import { Query, QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatEntity } from '../chat.entity.ts';
import { chatNotFound } from '../chat-errors.ts';
import { MessageEntity } from '../message.entity.ts';

// A hard cap instead of pagination for now; a cursor by `seq` can be added the same way as for chats.
const MESSAGES_LIMIT = 500;

export class ListMessagesQuery extends Query<MessageEntity[]> {
  constructor(
    public readonly userId: string,
    public readonly chatId: string,
  ) {
    super();
  }
}

@QueryHandler(ListMessagesQuery)
export class ListMessagesHandler implements IQueryHandler<ListMessagesQuery> {
  constructor(
    @InjectRepository(ChatEntity)
    private readonly chats: Repository<ChatEntity>,
    @InjectRepository(MessageEntity)
    private readonly messages: Repository<MessageEntity>,
  ) {}

  async execute({ userId, chatId }: ListMessagesQuery): Promise<MessageEntity[]> {
    if (!(await this.chats.existsBy({ id: chatId, userId }))) throw chatNotFound();

    return this.messages.find({ where: { chatId }, order: { seq: 'ASC' }, take: MESSAGES_LIMIT });
  }
}
