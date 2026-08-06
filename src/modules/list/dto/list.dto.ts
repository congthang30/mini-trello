import { Type } from 'class-transformer';
import { IsNumber, IsString, Length, Min } from 'class-validator';

export class CreateListDto {
  @IsString()
  @Length(1, 100)
  title!: string;
}

export class UpdateListTitleDto {
  @IsString()
  @Length(1, 100)
  title!: string;
}

export class UpdateListPositionDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  position!: number;
}
