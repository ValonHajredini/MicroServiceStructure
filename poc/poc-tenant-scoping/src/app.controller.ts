import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { TenantContextService, CurrentTenant } from '@microservice/auth-utils';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly tenantContext: TenantContextService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('/tenant-test')
  testTenantContext(@CurrentTenant() tenantId: string): object {
    const tenantFromContext = this.tenantContext.getTenant();
    return {
      message: 'Tenant context is working',
      tenantFromDecorator: tenantId,
      tenantFromService: tenantFromContext,
      match: tenantId === tenantFromContext,
    };
  }
}
