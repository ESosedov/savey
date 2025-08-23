import {
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Content } from '../../content/entities/content.entity';

@Entity('folders')
export class Folder {
  @PrimaryColumn('uuid')
  @Generated('uuid')
  id: string;

  @Column({ unique: true })
  title: string;

  @Column()
  isPublic: boolean;

  @ManyToOne(() => User, (user) => user.folders)
  @JoinColumn({ name: 'userId' })
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
