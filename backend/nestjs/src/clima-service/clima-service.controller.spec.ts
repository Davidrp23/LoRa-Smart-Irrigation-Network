import { Test, TestingModule } from '@nestjs/testing';
import { ClimaServiceController } from './clima-service.controller';
import { ClimaServiceService } from './clima-service.service';

describe('ClimaServiceController', () => {
  let controller: ClimaServiceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClimaServiceController],
      providers: [ClimaServiceService],
    }).compile();

    controller = module.get<ClimaServiceController>(ClimaServiceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
