import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

@Entity('session_members')
@Unique(['sessionId', 'cabinetId'])
export class SessionMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  sessionId: string;

  @Column()
  cabinetId: string;
}
