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
import { ImageData } from '../interfaces/image-data.interface';

@Entity('content')
export class Content {
  @PrimaryColumn('uuid')
  @Generated('uuid')
  id: string;

  @Column('varchar')
  title: string;

  @Column('varchar', { nullable: true })
  url: string | null;

  @Column('varchar', { nullable: true })
  domain: string | null;

  @ManyToOne(() => User, (user) => user.content)
  @JoinColumn()
  user: User;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => Folder, (folder) => folder.content, { nullable: true })
  @JoinColumn()
  folder: Folder | null;

  @Column('uuid', { nullable: true })
  folderId: string | null;

  @Column('text', { nullable: true }) // исправлено
  favicon: string | null;

  @Column('text', { nullable: true }) // исправлено
  siteName: string | null;

  @Column('jsonb', { nullable: true })
  image: ImageData | null;

  @Column('text', { nullable: true })
  description: string | null;

  @Column('varchar', { nullable: true })
  type: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
