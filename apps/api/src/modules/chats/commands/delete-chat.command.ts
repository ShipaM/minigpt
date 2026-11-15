import { Command, CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatEntity } from '../chat.entity.ts';
import { chatNotFound } from '../chat-errors.ts';

export class DeleteChatCommand extends Command<void> {
  constructor(
    public readonly userId: string,
    public readonly chatId: string,
  ) {
    super();
  }
}

@CommandHandler(DeleteChatCommand)
export class DeleteChatHandler implements ICommandHandler<DeleteChatCommand> {
  constructor(
    @InjectRepository(ChatEntity)
    private readonly chats: Repository<ChatEntity>,
  ) {}

  async execute({ userId, chatId }: DeleteChatCommand): Promise<void> {
    // The messages of the chat are deleted by the database (ON DELETE CASCADE).
    const result = await this.chats.delete({ id: chatId, userId });

    if (!result.affected) throw chatNotFound();
  }
}
