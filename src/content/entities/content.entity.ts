import {
  Column,
  Entity,
  Generated,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Folder } from '../../folders/entities/folder.entity';

@Entity('content')
export class Content {
  @PrimaryColumn('uuid')
  @Generated('uuid')
  id: string;

  @Column({ nullable: true })
  title?: string;

  @Column({ nullable: true })
  url?: string;

  @ManyToOne(() => User)
  user: User;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => Folder, (folder) => folder.content)
  @JoinColumn({ name: 'folderId' })
  folder: Folder;

  @Column('uuid')
  folderId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
