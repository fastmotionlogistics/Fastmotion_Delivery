import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RespondToReviewDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  text: string;
}
