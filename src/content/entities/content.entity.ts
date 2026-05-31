import {
  Column,
  Entity,
  Generated,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  JoinTable,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Folder } from '../../folders/entities/folder.entity';
import { ImageData } from '../interfaces/image-data.interface';

export enum ContentType {
  LINK = 'link',
  PHOTO = 'photo',
  DOCUMENT = 'document',
}

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

  @ManyToMany(() => Folder, (folder) => folder.content)
  @JoinTable({
    name: 'content_folders',
    joinColumn: { name: 'contentId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'folderId', referencedColumnName: 'id' },
  })
  folders: Folder[];

  @Column('text', { nullable: true })
  favicon: string | null;

  @Column('text', { nullable: true })
  siteName: string | null;

  @Column('jsonb', { nullable: true })
  image: ImageData | null;

  @Column('text', { nullable: true })
  description: string | null;

  @Column('varchar', { nullable: true })
  type: string | null;

  @Column('varchar', { nullable: true, default: ContentType.LINK })
  contentType: string | null;

  @Column('varchar', { nullable: true })
  fileKey: string | null;

  @Column('bigint', { nullable: true })
  fileSize: number | null;

  @Column('varchar', { nullable: true })
  mimeType: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
