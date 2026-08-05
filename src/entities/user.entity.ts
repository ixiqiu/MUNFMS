import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Cabinet } from './cabinet.entity';

export enum UserRole {
  ADMIN = 'ADMIN',
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
    type: 'simple-enum',
    enum: UserRole,
  })
  role: UserRole;

  @Column()
  passwordHash: string;

  @ManyToOne(() => Cabinet)
  @JoinColumn({ name: 'cabinetId' })
  cabinet: Cabinet | null;

  @Column({ nullable: true })
  cabinetId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
