import {
  Column,
  Entity,
  Generated,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Content } from './content.entity';

@Entity('similar-content')
export class SimilarContent {
  @PrimaryColumn('uuid')
  @Generated('uuid')
  id: string;

  @Column('varchar')
  title: string;

  @Column('varchar', { nullable: true })
  url: string | null;

  @ManyToOne(() => Content, { onDelete: 'CASCADE' })
  content: Content;

  @Column('text', { nullable: true })
  description: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
