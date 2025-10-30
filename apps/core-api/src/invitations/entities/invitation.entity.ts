import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';

@Entity('invitations')
export class Invitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 50 })
  role: string; // 'admin', 'user'

  @Column({ type: 'varchar', length: 255, unique: true })
  @Index()
  token: string;

  @Column({ type: 'timestamp' })
  expires_at: Date;

  @Column({ type: 'uuid' })
  invited_by_user_id: string;

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  status: string; // 'pending', 'accepted', 'expired', 'cancelled', 'email_failed'

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'invited_by_user_id' })
  invitedBy: User;
}
