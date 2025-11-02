import { IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class UpdateColumnDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  wip_limit?: number;
}
