import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Cabinet } from './cabinet.entity';

export enum UserRole {
  DELEGATE = 'DELEGATE',
  ACADEMIC = 'ACADEMIC',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: UserRole,
  })
  role: UserRole;

  @Column()
  passwordHash: string;

  @ManyToOne(() => Cabinet)
  @JoinColumn({ name: 'cabinetId' })
  cabinet: Cabinet;

  @Column()
  cabinetId: string;
}
