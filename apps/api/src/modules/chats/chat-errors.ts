import { NotFoundException } from '@nestjs/common';

// One error for "no such chat" and "this chat is not yours": the client must not be able to tell them
// apart, otherwise the endpoint could be used to find out which chat ids exist.
export const chatNotFound = (): NotFoundException => new NotFoundException('Chat not found');
