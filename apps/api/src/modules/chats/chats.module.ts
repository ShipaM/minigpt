import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatsController } from './chats.controller.ts';
import { ChatEntity } from './chat.entity.ts';
import { CreateChatHandler } from './commands/create-chat.command.ts';
import { DeleteChatHandler } from './commands/delete-chat.command.ts';
import { RenameChatHandler } from './commands/rename-chat.command.ts';
import { SendMessageHandler } from './commands/send-message.command.ts';
import { LlmProvider } from './llm/llm-provider.ts';
import { MockLlmProvider } from './llm/mock-llm.provider.ts';
import { MessageEntity } from './message.entity.ts';
import { GetChatHandler } from './queries/get-chat.query.ts';
import { ListChatsHandler } from './queries/list-chats.query.ts';
import { ListMessagesHandler } from './queries/list-messages.query.ts';

const commandHandlers = [
  CreateChatHandler,
  RenameChatHandler,
  DeleteChatHandler,
  SendMessageHandler,
];

const queryHandlers = [ListChatsHandler, GetChatHandler, ListMessagesHandler];

@Module({
  imports: [TypeOrmModule.forFeature([ChatEntity, MessageEntity])],
  controllers: [ChatsController],
  providers: [
    ...commandHandlers,
    ...queryHandlers,
    // The port is bound to an adapter here and only here. Day 5: replace the mock with a real provider.
    { provide: LlmProvider, useClass: MockLlmProvider },
  ],
})
export class ChatsModule {}
