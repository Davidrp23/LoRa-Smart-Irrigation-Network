import { Test, TestingModule } from '@nestjs/testing';
import { MotasService } from './motas.service';

describe('MotasService', () => {
  let service: MotasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MotasService],
    }).compile();

    service = module.get<MotasService>(MotasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
