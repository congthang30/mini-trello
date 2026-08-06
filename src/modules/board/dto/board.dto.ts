import { IsOptional, IsString, Length, MinLength } from 'class-validator';

export class BoardDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  description?: string;
}

export class UpdateBoardDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;
}
