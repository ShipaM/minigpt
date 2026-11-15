import { Command, CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DEFAULT_CHAT_TITLE } from '@minigpt/contracts';
import { ChatEntity } from '../chat.entity.ts';

// "What the user wants": a plain data class without logic. `Command<ChatEntity>` says what it returns.
export class CreateChatCommand extends Command<ChatEntity> {
  constructor(
    public readonly userId: string,
    public readonly title?: string,
  ) {
    super();
  }
}

@CommandHandler(CreateChatCommand)
export class CreateChatHandler implements ICommandHandler<CreateChatCommand> {
  constructor(
    @InjectRepository(ChatEntity)
    private readonly chats: Repository<ChatEntity>,
  ) {}

  execute({ userId, title }: CreateChatCommand): Promise<ChatEntity> {
    return this.chats.save(this.chats.create({ userId, title: title ?? DEFAULT_CHAT_TITLE }));
  }
}
