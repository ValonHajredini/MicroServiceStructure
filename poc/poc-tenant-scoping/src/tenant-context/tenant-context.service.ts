import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

@Injectable()
export class TenantContextService {
  private readonly asyncLocalStorage = new AsyncLocalStorage<string>();

  run(tenantId: string, callback: () => void): void {
    this.asyncLocalStorage.run(tenantId, callback);
  }

  getTenant(): string {
    const tenantId = this.asyncLocalStorage.getStore();
    if (!tenantId) {
      throw new Error('Tenant context not set');
    }
    return tenantId;
  }

  setTenant(tenantId: string): void {
    // Note: This method is for testing purposes only
    // In production, always use run() method
    this.asyncLocalStorage.enterWith(tenantId);
  }
}
