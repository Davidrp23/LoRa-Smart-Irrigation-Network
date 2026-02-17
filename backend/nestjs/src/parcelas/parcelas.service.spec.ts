import { Test, TestingModule } from '@nestjs/testing';
import { ParcelasService } from './parcelas.service';

describe('ParcelasService', () => {
  let service: ParcelasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ParcelasService],
    }).compile();

    service = module.get<ParcelasService>(ParcelasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
