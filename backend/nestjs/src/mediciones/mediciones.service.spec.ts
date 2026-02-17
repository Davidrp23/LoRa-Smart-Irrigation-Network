import { Test, TestingModule } from '@nestjs/testing';
import { MedicionesService } from './mediciones.service';

describe('MedicionesService', () => {
  let service: MedicionesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MedicionesService],
    }).compile();

    service = module.get<MedicionesService>(MedicionesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
