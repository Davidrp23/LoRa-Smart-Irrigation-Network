import { Test, TestingModule } from '@nestjs/testing';
import { TipoSueloController } from './tipo-suelo.controller';
import { TipoSueloService } from './tipo-suelo.service';

describe('TipoSueloController', () => {
  let controller: TipoSueloController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TipoSueloController],
      providers: [TipoSueloService],
    }).compile();

    controller = module.get<TipoSueloController>(TipoSueloController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
