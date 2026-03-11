import { Test, TestingModule } from '@nestjs/testing';
import { TipoRiegoController } from './tipo-riego.controller';
import { TipoRiegoService } from './tipo-riego.service';

describe('TipoRiegoController', () => {
  let controller: TipoRiegoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TipoRiegoController],
      providers: [TipoRiegoService],
    }).compile();

    controller = module.get<TipoRiegoController>(TipoRiegoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
