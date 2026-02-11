import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class UpdateCartItemDto {
  @ApiProperty()
  @IsNumber()
  @Min(1)
  quantity: number;
}
export class SaveCartAsTemplateDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;
}
