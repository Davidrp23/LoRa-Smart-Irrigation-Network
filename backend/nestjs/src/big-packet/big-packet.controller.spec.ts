import { Test, TestingModule } from '@nestjs/testing';
import { BigPacketController } from './big-packet.controller';
import { BigPacketService } from './big-packet.service';

describe('BigPacketController', () => {
  let controller: BigPacketController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BigPacketController],
      providers: [BigPacketService],
    }).compile();

    controller = module.get<BigPacketController>(BigPacketController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
