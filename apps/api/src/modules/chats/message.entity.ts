import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { MessageRole } from '@minigpt/contracts';
import { ChatEntity } from './chat.entity.ts';

@Entity({ name: 'messages' })
// The database itself rejects any role except these two (the TypeScript type alone would not protect the data).
@Check('CHK_messages_role', `"role" IN ('user', 'assistant')`)
@Index(['chatId', 'seq'])
export class MessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'chat_id', type: 'uuid' })
  chatId!: string;

  // Deleting a chat deletes its messages.
  @ManyToOne(() => ChatEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chat_id' })
  chat?: ChatEntity;

  @Column({ type: 'varchar', length: 16 })
  role!: MessageRole;

  @Column({ type: 'text' })
  content!: string;

  /**
   * Strictly increasing number assigned by the database: the order of messages in a chat.
   * Timestamps cannot do this job: a question and its answer can get the same millisecond.
   * bigint comes back from the driver as a string (JavaScript numbers lose precision): we only sort by it.
   */
  @Generated('increment')
  @Column({ type: 'bigint' })
  seq!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', precision: 3 })
  createdAt!: Date;
}
