import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Session } from './session.entity';
import { FileEntity } from './file.entity';

export enum MessageSenderType {
  CABINET = 'CABINET',
  ACADEMIC = 'ACADEMIC',
}

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Session)
  @JoinColumn({ name: 'sessionId' })
  session: Session;

  @Column()
  sessionId: string;

  @Column({ nullable: true })
  senderCabinetId: string | null;

  @Column({
    type: 'simple-enum',
    enum: MessageSenderType,
    default: MessageSenderType.CABINET,
  })
  senderType: MessageSenderType;

  @ManyToOne(() => FileEntity)
  @JoinColumn({ name: 'fileId' })
  file: FileEntity;

  @Column()
  fileId: string;

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
