import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  cabinetA_id: string;

  @Column({ nullable: true })
  cabinetB_id: string;

  @Column({ type: 'datetime', nullable: true })
  lastMessageTime: Date;
}
