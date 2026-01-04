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
import { Content } from '../../content/entities/content.entity';
import { OAuthProvider } from '../interfaces/oauth-provider.interface';

@Entity('users')
export class User {
  @PrimaryColumn('uuid')
  @Generated('uuid')
  id: string;

  @Column('varchar', { unique: true })
  email: string;

  @Column('varchar')
  firstName: string;

  @Column('varchar')
  lastName: string;

  @Column('boolean', { default: true })
  isActive: boolean;

  @Column('varchar')
  passwordHash: string;

  @Column('boolean', { default: false })
  emailVerified: boolean;

  @Column('varchar', { nullable: true })
  emailVerificationToken: string | null;

  @Column('timestamp', { nullable: true })
  emailVerificationTokenExpiry: Date | null;

  @OneToMany(() => Folder, (folder) => folder.user)
  folders: Folder[];

  @OneToMany(() => Content, (content) => content.user)
  content: Content[];

  @Column('jsonb', { default: [] })
  oauthProviders: OAuthProvider[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
