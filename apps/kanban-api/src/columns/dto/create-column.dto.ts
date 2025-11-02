import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from "class-validator";

export class CreateColumnDto {
  @IsUUID()
  boardId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @IsInt()
  @Min(0)
  position!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  wipLimit?: number;
}
