import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateBoardDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
