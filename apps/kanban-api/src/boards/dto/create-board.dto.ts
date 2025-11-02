import { IsOptional, IsString, MaxLength } from "class-validator";

export class CreateBoardDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
