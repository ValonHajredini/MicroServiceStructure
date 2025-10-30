import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JoinRequestsController } from './join-requests.controller';
import { JoinRequestsService } from './join-requests.service';
import { JoinRequest } from './entities/join-request.entity';
import { UserTenantRole } from '../users/entities/user-tenant-role.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([JoinRequest, UserTenantRole, Tenant]),
    EmailModule,
  ],
  controllers: [JoinRequestsController],
  providers: [JoinRequestsService],
  exports: [JoinRequestsService],
})
export class JoinRequestsModule {}
