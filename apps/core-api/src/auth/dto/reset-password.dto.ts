import { IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Password reset token from email',
    example: 'abc123...',
  })
  @IsString()
  @MinLength(1)
  token: string;

  @ApiProperty({
    description:
      'New password (min 8 chars, must include uppercase, lowercase, and number/special char)',
    example: 'NewPassword123!',
  })
  @IsString()
  @MinLength(8)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'Password must contain uppercase, lowercase, and number/special char',
  })
  newPassword: string;
}
