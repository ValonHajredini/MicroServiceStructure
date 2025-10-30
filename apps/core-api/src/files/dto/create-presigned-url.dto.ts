import {
  IsString,
  IsNumber,
  IsEnum,
  Max,
  IsNotEmpty,
  Min,
} from 'class-validator';
import { FILE_CONSTRAINTS } from '../../common/constants/file-constraints';

export class CreatePresignedUrlDto {
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsNumber()
  @Min(1)
  @Max(FILE_CONSTRAINTS.MAX_FILE_SIZE)
  fileSize: number;

  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @IsEnum(FILE_CONSTRAINTS.VALID_SERVICES, {
    message: `targetService must be one of: ${FILE_CONSTRAINTS.VALID_SERVICES.join(', ')}`,
  })
  targetService: string;
}
