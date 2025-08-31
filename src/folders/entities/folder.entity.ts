import {
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Content } from '../../content/entities/content.entity';

@Entity('folders')
@Unique('UQ_folder_title_user', ['title', 'userId'])
export class Folder {
  @PrimaryColumn('uuid')
  @Generated('uuid')
  id: string;

  @Column('varchar')
  title: string;

  @Column('boolean', { default: false })
  isPublic: boolean;

  @ManyToOne(() => User, (user) => user.folders)
  @JoinColumn()
  user: User;

  @Column('uuid')
  userId: string;

  @OneToMany(() => Content, (content) => content.folder)
  content: Content[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
