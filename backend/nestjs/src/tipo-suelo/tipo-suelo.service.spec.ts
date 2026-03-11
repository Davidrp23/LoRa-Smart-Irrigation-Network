import { Test, TestingModule } from '@nestjs/testing';
import { TipoSueloService } from './tipo-suelo.service';

describe('TipoSueloService', () => {
  let service: TipoSueloService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TipoSueloService],
    }).compile();

    service = module.get<TipoSueloService>(TipoSueloService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
