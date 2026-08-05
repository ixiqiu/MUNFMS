import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { User } from './user.entity';

export enum CabinetType {
  CABINET = 'CABINET',
  BUREAU = 'BUREAU',
  CRISIS = 'CRISIS',
}

@Entity('cabinets')
export class Cabinet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // 如 "法国", "主席团"

  @Column({
    type: 'simple-enum',
    enum: CabinetType,
  })
  type: CabinetType;

  @OneToMany(() => User, (user) => user.cabinet)
  users: User[];
}
