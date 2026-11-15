import { BadRequestException } from '@nestjs/common';
import { QueryHandler, Query, type IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatEntity } from '../chat.entity.ts';
import { decodeCursor, encodeCursor } from '../cursor.ts';

export interface ChatPage {
  items: ChatEntity[];
  nextCursor: string | null;
}

/** A query reads and never changes anything. */
export class ListChatsQuery extends Query<ChatPage> {
  constructor(
    public readonly userId: string,
    public readonly limit: number,
    public readonly cursor?: string,
  ) {
    super();
  }
}

@QueryHandler(ListChatsQuery)
export class ListChatsHandler implements IQueryHandler<ListChatsQuery> {
  constructor(@InjectRepository(ChatEntity) private readonly chats: Repository<ChatEntity>) {}
  async execute({ userId, limit, cursor }: ListChatsQuery): Promise<ChatPage> {
    const query = this.chats
      .createQueryBuilder('chat')
      .where('chat.userId = :userId', { userId })
      .orderBy('chat.updatedAt', 'DESC')
      .addOrderBy('chat.id', 'DESC') // a tie-breaker: two chats can share a millisecond
      .limit(limit + 1); // one extra row tells us whether there is a next page

    if (cursor !== undefined) {
      const position = decodeCursor(cursor);
      if (!position) throw new BadRequestException('Invalid cursor');

      // "Strictly after the last row of the previous page" in the same sort order.
      query.andWhere('(chat.updatedAt, chat.id) < (:cursorUpdatedAt, :cursorId)', {
        cursorUpdatedAt: position.updatedAt,
        cursorId: position.id,
      });
    }

    const rows = await query.getMany();

    const items = rows.slice(0, limit);

    const last = items.at(-1);

    const nextCursor =
      rows.length > limit && last
        ? encodeCursor({ updatedAt: last.updatedAt.toISOString(), id: last.id })
        : null;

    return { items, nextCursor };
  }
}
