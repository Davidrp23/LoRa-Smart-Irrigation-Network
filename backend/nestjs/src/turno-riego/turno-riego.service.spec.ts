import { Test, TestingModule } from '@nestjs/testing';
import { TurnoRiegoService } from './turno-riego.service';

describe('TurnoRiegoService', () => {
  let service: TurnoRiegoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TurnoRiegoService],
    }).compile();

    service = module.get<TurnoRiegoService>(TurnoRiegoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
