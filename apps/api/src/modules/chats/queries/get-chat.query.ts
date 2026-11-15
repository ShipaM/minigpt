import { Query, QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatEntity } from '../chat.entity.ts';
import { chatNotFound } from '../chat-errors.ts';

export class GetChatQuery extends Query<ChatEntity> {
  constructor(
    public readonly userId: string,
    public readonly chatId: string,
  ) {
    super();
  }
}

@QueryHandler(GetChatQuery)
export class GetChatHandler implements IQueryHandler<GetChatQuery> {
  constructor(@InjectRepository(ChatEntity) private readonly chats: Repository<ChatEntity>) {}
  async execute({ userId, chatId }: GetChatQuery): Promise<ChatEntity> {
    const chat = await this.chats.findOneBy({ id: chatId, userId });

    if (!chat) throw chatNotFound();

    return chat;
  }
}
