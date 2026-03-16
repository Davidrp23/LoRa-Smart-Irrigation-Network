import { Test, TestingModule } from '@nestjs/testing';
import { ClimaServiceService } from './clima-service.service';

describe('ClimaServiceService', () => {
  let service: ClimaServiceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClimaServiceService],
    }).compile();

    service = module.get<ClimaServiceService>(ClimaServiceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
