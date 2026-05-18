import { Module } from '@nestjs/common';
import { AuthModule as SharedAuthModule } from '@autoflow/shared-auth';
import { AuthController } from './auth.controller';

@Module({
  imports: [SharedAuthModule],
  controllers: [AuthController],
})
export class ApiAuthModule {}
