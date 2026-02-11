import { ApiProperty } from '@nestjs/swagger';
// import { AutoMap } from '@automapper/classes';
import { Type } from 'class-transformer';
import { IsEmail, IsStrongPassword, IsString, IsDateString } from 'class-validator';

export class RegisterUserDto {
  // @AutoMap()
  // @ApiProperty({
  //   example: 'John',
  // })
  // @IsString()
  // firstName: string;

  // @ApiProperty({
  //   example: 'doe',
  // })
  // @IsString()
  // lastName: string;

  @ApiProperty({
    example: 'email@email.com',
  })
  @IsEmail()
  email: string;

  // @AutoMap()
  @ApiProperty({
    example: 'Password@123',
  })
  @IsStrongPassword()
  password: string;

  // @ApiProperty({
  //   enum: Role,
  // })
  // @IsEnum(Role)
  // type: Role;
}
export class UpdateUserInfoDto {
  @ApiProperty({
    example: 'John',
  })
  @IsString()
  firstName: string;

  @ApiProperty({
    example: 'doe',
  })
  @IsString()
  lastName: string;

  @ApiProperty({
    example: 'doe',
  })
  @IsString()
  phone: string;

  @ApiProperty({
    example: '1999-02-22',
  })
  @IsDateString()
  dob: string;

  // @ApiProperty({
  //   enum: Gender,
  // })
  // @IsEnum(Gender)
  // gender: Gender;
}
