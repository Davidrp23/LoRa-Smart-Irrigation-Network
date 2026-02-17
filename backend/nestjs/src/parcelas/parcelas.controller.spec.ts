import { Test, TestingModule } from '@nestjs/testing';
import { ParcelasController } from './parcelas.controller';
import { ParcelasService } from './parcelas.service';

describe('ParcelasController', () => {
  let controller: ParcelasController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ParcelasController],
      providers: [ParcelasService],
    }).compile();

    controller = module.get<ParcelasController>(ParcelasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
