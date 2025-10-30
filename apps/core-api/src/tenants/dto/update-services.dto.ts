import { IsArray, IsEnum } from 'class-validator';
import { ServiceName } from '@shared-types';

export class UpdateServicesDto {
  @IsArray()
  @IsEnum(ServiceName, { each: true })
  services: string[];
}
