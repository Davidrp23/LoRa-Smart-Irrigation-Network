import { Module } from '@nestjs/common';
import { ClimaServiceService } from './clima-service.service';
import { ClimaServiceController } from './clima-service.controller';

@Module({
  controllers: [ClimaServiceController],
  providers: [ClimaServiceService],
})
export class ClimaServiceModule {}
