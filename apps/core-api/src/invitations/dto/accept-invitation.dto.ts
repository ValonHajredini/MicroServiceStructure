import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, Matches } from 'class-validator';

export class AcceptInvitationDto {
  @ApiProperty({
    example: 'abc123def456...',
    description: 'Invitation token from email link',
  })
  @IsString()
  token: string;

  @ApiProperty({
    example: 'Jane',
    description: 'User first name',
  })
  @IsString()
  @MinLength(1)
  firstName: string;

  @ApiProperty({
    example: 'Smith',
    description: 'User last name',
  })
  @IsString()
  @MinLength(1)
  lastName: string;

  @ApiProperty({
    example: 'SecurePass123!',
    description:
      'User password (min 8 chars, must contain uppercase, lowercase, and number/special char)',
  })
  @IsString()
  @MinLength(8)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'Password must contain uppercase, lowercase, and number/special char',
  })
  password: string;
}
