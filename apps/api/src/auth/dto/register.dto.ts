import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';
import { Role } from '@autoflow/shared-types';

export class RegisterDto {
  @ApiProperty({ example: 'john.doe', description: 'Unique username' })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({ example: 'john@example.com', description: 'User email address' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'securePass123', description: 'Password (min 6 characters)' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ example: 'John Doe', description: 'Display name shown in UI' })
  @IsString()
  @IsNotEmpty()
  displayName!: string;

  @ApiProperty({
    example: [Role.CASHIER],
    enum: Role,
    isArray: true,
    description: 'Roles to assign to the user',
  })
  @IsArray()
  @IsEnum(Role, { each: true })
  roles!: Role[];
}
