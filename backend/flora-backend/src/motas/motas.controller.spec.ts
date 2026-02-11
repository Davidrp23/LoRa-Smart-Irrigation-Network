import { Test, TestingModule } from '@nestjs/testing';
import { MotasController } from './motas.controller';
import { MotasService } from './motas.service';

describe('MotasController', () => {
  let controller: MotasController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MotasController],
      providers: [MotasService],
    }).compile();

    controller = module.get<MotasController>(MotasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
