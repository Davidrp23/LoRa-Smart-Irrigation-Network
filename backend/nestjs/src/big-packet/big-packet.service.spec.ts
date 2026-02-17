import { Test, TestingModule } from '@nestjs/testing';
import { BigPacketService } from './big-packet.service';

describe('BigPacketService', () => {
  let service: BigPacketService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BigPacketService],
    }).compile();

    service = module.get<BigPacketService>(BigPacketService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
