import { IsArray, IsUUID } from "class-validator";

export class ReorderColumnsDto {
  @IsArray()
  @IsUUID(undefined, { each: true })
  columnIds!: string[];
}
