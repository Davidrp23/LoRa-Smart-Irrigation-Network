import { Test, TestingModule } from '@nestjs/testing';
import { TurnoRiegoController } from './turno-riego.controller';
import { TurnoRiegoService } from './turno-riego.service';

describe('TurnoRiegoController', () => {
  let controller: TurnoRiegoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TurnoRiegoController],
      providers: [TurnoRiegoService],
    }).compile();

    controller = module.get<TurnoRiegoController>(TurnoRiegoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
