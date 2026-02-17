import { PartialType } from '@nestjs/swagger';
import { CreateMotaDto } from './create-mota.dto';

export class UpdateMotaDto extends PartialType(CreateMotaDto) {}
