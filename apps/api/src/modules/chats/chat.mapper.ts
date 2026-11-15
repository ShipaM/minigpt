import type { ChatResponse, MessageResponse } from '@minigpt/contracts';
import type { ChatEntity } from './chat.entity.ts';
import type { MessageEntity } from './message.entity.ts';

// Only public fields leave the API: not `userId`, not the internal `seq`.
export function toChatResponse(chat: ChatEntity): ChatResponse {
  return {
    id: chat.id,
    title: chat.title,
    createdAt: chat.createdAt.toISOString(),
    updatedAt: chat.updatedAt.toISOString(),
  };
}

export function toMessageResponse(message: MessageEntity): MessageResponse {
  return {
    id: message.id,
    chatId: message.chatId,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  };
}
