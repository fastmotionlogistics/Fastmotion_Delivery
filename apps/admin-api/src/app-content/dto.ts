import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class FaqItemDto {
  @ApiPropertyOptional({ example: 'How do I track my package?' })
  @IsString()
  question: string;

  @ApiPropertyOptional({ example: 'You can track from the dashboard.' })
  @IsString()
  answer: string;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @IsOptional()
  order?: number;
}

export class UpdateAppContentDto {
  @ApiPropertyOptional({ description: 'HTML string for Terms & Conditions (Customer App)' })
  @IsString()
  @IsOptional()
  termsAndConditions?: string;

  @ApiPropertyOptional({ description: 'HTML string for Privacy Policy (Customer App)' })
  @IsString()
  @IsOptional()
  privacyPolicy?: string;

  @ApiPropertyOptional({ description: 'HTML string for Terms & Conditions (Rider App)' })
  @IsString()
  @IsOptional()
  riderTermsAndConditions?: string;

  @ApiPropertyOptional({ description: 'HTML string for Privacy Policy (Rider App)' })
  @IsString()
  @IsOptional()
  riderPrivacyPolicy?: string;

  @ApiPropertyOptional({ example: 'support@fastmotion.ng' })
  @IsString()
  @IsOptional()
  contactEmail?: string;

  @ApiPropertyOptional({ example: '+234 800 000 0000' })
  @IsString()
  @IsOptional()
  contactPhone?: string;

  @ApiPropertyOptional({ type: [FaqItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FaqItemDto)
  @IsOptional()
  faqs?: FaqItemDto[];
}
