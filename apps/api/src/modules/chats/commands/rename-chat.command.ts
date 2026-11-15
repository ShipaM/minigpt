import { Command, CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatEntity } from '../chat.entity.ts';
import { chatNotFound } from '../chat-errors.ts';

export class RenameChatCommand extends Command<ChatEntity> {
  constructor(
    public readonly userId: string,
    public readonly chatId: string,
    public readonly title: string,
  ) {
    super();
  }
}

@CommandHandler(RenameChatCommand)
export class RenameChatHandler implements ICommandHandler<RenameChatCommand> {
  constructor(@InjectRepository(ChatEntity) private readonly chats: Repository<ChatEntity>) {}
  async execute({ userId, chatId, title }: RenameChatCommand): Promise<ChatEntity> {
    // The owner is part of the condition itself (WHERE id = ? AND user_id = ?): a foreign chat simply
    // "does not exist" for this user. No "load first, compare later" gap in which a mistake could hide.

    const result = await this.chats.update({ id: chatId, userId }, { title });

    if (!result.affected) throw chatNotFound();

    return this.chats.findOneByOrFail({ id: chatId });
  }
}
