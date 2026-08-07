import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator';
import { CardPriority } from '../entities/card.entity';

export class CreateCardDto {
  @IsString()
  @Length(1, 200)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsEnum(CardPriority)
  priority?: CardPriority;
}

export class UpdateCardDto {
  @IsOptional()
  @IsString()
  @Length(1, 200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsEnum(CardPriority)
  priority?: CardPriority;
}

export class MoveCardDto {
  @IsString()
  listId!: string;

  @IsInt()
  @Min(1)
  position!: number;
}
