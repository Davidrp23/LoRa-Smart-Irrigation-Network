import { Test, TestingModule } from '@nestjs/testing';
import { TipoCultivoService } from './tipo-cultivo.service';

describe('TipoCultivoService', () => {
  let service: TipoCultivoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TipoCultivoService],
    }).compile();

    service = module.get<TipoCultivoService>(TipoCultivoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
