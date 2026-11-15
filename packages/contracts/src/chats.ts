import { z } from 'zod';

export const CHAT_TITLE_MAX_LENGTH = 100;

export const DEFAULT_CHAT_TITLE = 'New chat';

export const MESSAGE_MAX_LENGTH = 4000;

export const CHATS_PAGE_DEFAULT = 10;

export const CHATS_PAGE_MAX = 100;

export const ChatResponseSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1),
  createdAt: z.iso.datetime(),
  // Moves forward when a message is sent: the list is sorted by it (newest activity first).
  updatedAt: z.iso.datetime(),
});

export type ChatResponse = z.infer<typeof ChatResponseSchema>;

export const MessageRoleSchema = z.enum(['user', 'assistant']);

export type MessageRole = z.infer<typeof MessageRoleSchema>;

export const MessageResponseSchema = z.object({
  id: z.uuid(),
  chatId: z.uuid(),
  role: MessageRoleSchema,
  content: z.string(),
  createdAt: z.iso.datetime(),
});

export type MessageResponse = z.infer<typeof MessageResponseSchema>;

// One page of chats. `nextCursor` is null on the last page; otherwise pass it back as `?cursor=`.
export const ChatListResponseSchema = z.object({
  items: z.array(ChatResponseSchema),
  nextCursor: z.string().nullable(),
});

export type ChatListResponse = z.infer<typeof ChatListResponseSchema>;

export const MessageListResponseSchema = z.object({ items: z.array(MessageResponseSchema) });

export type MessageListResponse = z.infer<typeof MessageListResponseSchema>;

// The answer to "send a message": what the user wrote and what the model replied.
export const SendMessageResponseSchema = z.object({
  userMessage: MessageResponseSchema,
  assistantMessage: MessageResponseSchema,
});

export type SendMessageResponse = z.infer<typeof SendMessageResponseSchema>;
