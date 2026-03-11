import { Test, TestingModule } from '@nestjs/testing';
import { TipoCultivoController } from './tipo-cultivo.controller';
import { TipoCultivoService } from './tipo-cultivo.service';

describe('TipoCultivoController', () => {
  let controller: TipoCultivoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TipoCultivoController],
      providers: [TipoCultivoService],
    }).compile();

    controller = module.get<TipoCultivoController>(TipoCultivoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
