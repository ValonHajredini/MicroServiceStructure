import { SetMetadata } from '@nestjs/common';

export const RequiredService = (service: string) =>
  SetMetadata('requiredService', service);
