import { Test, TestingModule } from '@nestjs/testing';
import { TipoRiegoService } from './tipo-riego.service';

describe('TipoRiegoService', () => {
  let service: TipoRiegoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TipoRiegoService],
    }).compile();

    service = module.get<TipoRiegoService>(TipoRiegoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
