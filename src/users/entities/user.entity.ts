import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Generated,
  PrimaryColumn,
  OneToMany,
} from 'typeorm';
import { Folder } from '../../folders/entities/folder.entity';

@Entity('users')
export class User {
  @PrimaryColumn('uuid')
  @Generated('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ default: true })
  isActive: boolean;

  @Column()
  passwordHash: string;

  @OneToMany(() => Folder, (folder) => folder.user)
  folders: Folder[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
