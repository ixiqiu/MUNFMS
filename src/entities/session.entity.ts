import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  cabinetA_id: string; // 发起方内阁 ID

  @Column()
  cabinetB_id: string; // 接收方内阁 ID

  @Column({ type: 'datetime', nullable: true })
  lastMessageTime: Date;
}
