import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../users/user.entity.ts';

@Entity({ name: 'chats' })
// The list query: "chats of one user, newest activity first" is served by this index.
@Index(['userId', 'updatedAt', 'id'])
export class ChatEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  // Deleting a user deletes their chats (and, through chats, their messages).
  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @Column({ type: 'varchar', length: 100 })
  title!: string;

  // precision: 3 = milliseconds, exactly what a JavaScript Date holds. This matters for the pagination
  // cursor: with microseconds in the database, a cursor built from a Date could skip rows.
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', precision: 3 })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', precision: 3 })
  updatedAt!: Date;
}
