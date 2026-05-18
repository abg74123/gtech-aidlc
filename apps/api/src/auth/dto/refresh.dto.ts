import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'Refresh token received from login or previous refresh',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
