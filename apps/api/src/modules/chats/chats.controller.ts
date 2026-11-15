import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CHATS_PAGE_DEFAULT,
  type ChatListResponse,
  type ChatResponse,
  type MessageListResponse,
  type SendMessageResponse,
} from '@minigpt/contracts';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator.ts';
import { toChatResponse, toMessageResponse } from './chat.mapper.ts';
import { CreateChatCommand } from './commands/create-chat.command.ts';
import { DeleteChatCommand } from './commands/delete-chat.command.ts';
import { RenameChatCommand } from './commands/rename-chat.command.ts';
import { SendMessageCommand } from './commands/send-message.command.ts';
import { CreateChatDto } from './dto/create-chat.dto.ts';
import { ListChatsQueryDto } from './dto/list-chats-query.dto.ts';
import { RenameChatDto } from './dto/rename-chat.dto.ts';
import { SendMessageDto } from './dto/send-message.dto.ts';
import { GetChatQuery } from './queries/get-chat.query.ts';
import { ListChatsQuery } from './queries/list-chats.query.ts';
import { ListMessagesQuery } from './queries/list-messages.query.ts';

//A thin controller: it turns HTTP into a command or a query and the result into a response.
//There is no business logic and no database access here; that is the job of the handlers.
@ApiTags('chats')
@ApiBearerAuth()
@Controller('chats')
export class ChatsController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createChat(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateChatDto,
  ): Promise<ChatResponse> {
    return toChatResponse(await this.commands.execute(new CreateChatCommand(user.id, dto.title)));
  }

  @Get()
  async getChatlist(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListChatsQueryDto,
  ): Promise<ChatListResponse> {
    const page = await this.queries.execute(
      new ListChatsQuery(user.id, query.limit ?? CHATS_PAGE_DEFAULT, query.cursor),
    );
    return { items: page.items.map(toChatResponse), nextCursor: page.nextCursor };
  }

  @Get(':id')
  async getChatById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ChatResponse> {
    return toChatResponse(await this.queries.execute(new GetChatQuery(user.id, id)));
  }

  @Patch(':id')
  async renameChat(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: RenameChatDto,
  ): Promise<ChatResponse> {
    return toChatResponse(
      await this.commands.execute(new RenameChatCommand(user.id, id, dto.title)),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeChat(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    await this.commands.execute(new DeleteChatCommand(user.id, id));
  }

  @Get(':id/messages')
  async messages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<MessageListResponse> {
    const items = await this.queries.execute(new ListMessagesQuery(user.id, id));
    return { items: items.map(toMessageResponse) };
  }

  @Post(':id/messages')
  @HttpCode(HttpStatus.CREATED)
  async send(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SendMessageDto,
  ): Promise<SendMessageResponse> {
    const { userMessage, assistantMessage } = await this.commands.execute(
      new SendMessageCommand(user.id, id, dto.content),
    );
    return {
      userMessage: toMessageResponse(userMessage),
      assistantMessage: toMessageResponse(assistantMessage),
    };
  }
}
