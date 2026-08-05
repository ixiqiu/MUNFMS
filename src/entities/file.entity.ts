import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum SpaceType {
  CABINET = 'CABINET',
  PUBLIC = 'PUBLIC',
  CONFERENCE = 'CONFERENCE',
}

@Entity('files')
export class FileEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fileName: string; // 原始文件名

  @Column()
  storagePath: string; // 本地物理相对路径 (如: cabinet/uuid_xxx.pdf)

  @Column({
    type: 'simple-enum',
    enum: SpaceType,
  })
  spaceType: SpaceType;

  @Column()
  uploaderId: string; // 上传者 User ID

  @Column({ nullable: true })
  targetId: string; // 归属目标 ID (如内阁ID，或公共/会议空间的全局标识)

  @Column({ default: false })
  isFromConference: boolean; // 标记是否由会议空间一键复制而来

  @CreateDateColumn()
  createdAt: Date;
}
